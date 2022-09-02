#include <windows.h>
#include <tchar.h>
#include <wrl.h>
#include <wil/com.h>
#include <shlobj_core.h>
#include "WebView2.h"

#define SIC1_DOMAIN _T("sic1-assets.schemescape.com")
#define SIC1_ROOT (_T("https://") SIC1_DOMAIN _T("/index.html"))

#define ERROR_STRING_NO_WEBVIEW2 "WebView2 runtime is not installed!\n\nReinstall SIC-1 or manually install the WebView2 runtime from the following link (note: you can use Ctrl+C to copy this text):\n\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703"

using namespace Microsoft::WRL;
using namespace wil;

static TCHAR szWindowClass[] = _T("DesktopApp");
static TCHAR szTitle[] = _T("SIC-1");
static com_ptr<ICoreWebView2Controller> webviewController;
static com_ptr<ICoreWebView2> webviewWindow;

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

int CALLBACK WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) noexcept try {
	// Check for WebView2 runtime first
	{
		unique_cotaskmem_string versionInfo;
		THROW_IF_FAILED_MSG(GetAvailableCoreWebView2BrowserVersionString(nullptr, &versionInfo), ERROR_STRING_NO_WEBVIEW2);
		THROW_HR_IF_NULL_MSG(E_NOINTERFACE, versionInfo, ERROR_STRING_NO_WEBVIEW2);
	}

	// Create and show a window
	WNDCLASSEX wcex;
	wcex.cbSize = sizeof(WNDCLASSEX);
	wcex.style = CS_HREDRAW | CS_VREDRAW;
	wcex.lpfnWndProc = WndProc;
	wcex.cbClsExtra = 0;
	wcex.cbWndExtra = 0;
	wcex.hInstance = hInstance;
	wcex.hIcon = LoadIcon(hInstance, IDI_APPLICATION);
	wcex.hCursor = LoadCursor(NULL, IDC_ARROW);
	wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
	wcex.lpszMenuName = NULL;
	wcex.lpszClassName = szWindowClass;
	wcex.hIconSm = LoadIcon(wcex.hInstance, IDI_APPLICATION);

	HWND hWnd = nullptr;
	THROW_LAST_ERROR_IF_MSG(RegisterClassEx(&wcex) == 0, "RegisterClassEx failed!");
	THROW_LAST_ERROR_IF_NULL_MSG(hWnd = CreateWindow(szWindowClass, szTitle, WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 1200, 900, NULL, NULL, hInstance, NULL), "CreateWindow failed!");

	ShowWindow(hWnd, nCmdShow);
	UpdateWindow(hWnd);

	// Store user data in %LocalAppData%\SIC-1
	unique_cotaskmem_string userDataFolder;

	{
		unique_cotaskmem_string localAppDataFolder;
		THROW_IF_FAILED_MSG(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &localAppDataFolder), "Could not find Saved Games folder!");
		userDataFolder = str_printf<unique_cotaskmem_string>(L"%s\\SIC-1", localAppDataFolder.get());
	}


	// Create the web view
	THROW_IF_FAILED_MSG(CreateCoreWebView2EnvironmentWithOptions(nullptr, userDataFolder.get(), nullptr,
		Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
			[hWnd](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
				THROW_IF_FAILED_MSG(result, "Failed to create WebView2 environment!");
				env->CreateCoreWebView2Controller(hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
					[hWnd](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
						THROW_HR_IF_NULL_MSG(result, controller, "Failed to create WebView2 controller!");

						webviewController = controller;
						THROW_IF_FAILED_MSG(webviewController->get_CoreWebView2(&webviewWindow), "Failed to get CoreWebView2!");

						RECT bounds;
						GetClientRect(hWnd, &bounds);
						webviewController->put_Bounds(bounds);

						// Indicate that this is using the "steam" platform
						THROW_IF_FAILED_MSG(webviewWindow->AddScriptToExecuteOnDocumentCreated(L"globalThis.__platformString = \"steam\";", nullptr), "Failed to set platform string!");
						
						// Handle window.close() by closing the Win32 window
						THROW_IF_FAILED_MSG(webviewWindow->add_WindowCloseRequested(Callback<ICoreWebView2WindowCloseRequestedEventHandler>(
							[hWnd](ICoreWebView2* sender, IUnknown* args) {
								RETURN_IF_WIN32_BOOL_FALSE(PostMessage(hWnd, WM_CLOSE, 0, 0));
								return S_OK;
							}).Get(),
							nullptr), "Failed to setup window.close() handler!");

						// Reference SIC-1 assets
						auto webView3 = webviewWindow.query<ICoreWebView2_3>();
						THROW_IF_FAILED_MSG(webView3->SetVirtualHostNameToFolderMapping(SIC1_DOMAIN, _T("assets"), COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW), "Failed to setup folder mapping!");

						// Initial navigation
						THROW_IF_FAILED_MSG(webviewWindow->Navigate(SIC1_ROOT), "Failed to navigate!");

						return S_OK;
					}).Get());
				return S_OK;
			}).Get()), "CreateCoreWebView2EnvironmentWithOptions failed!");

	// Main message loop:
	MSG msg;
	while (GetMessage(&msg, NULL, 0, 0)) {
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}

	return (int)msg.wParam;
}
catch (const ResultException& e) {
	unique_cotaskmem_string message = str_printf<unique_cotaskmem_string>(L"%s\n\nError code: 0x%08x", e.GetFailureInfo().pszMessage, e.GetErrorCode());
	MessageBox(NULL, message.get(), szTitle, NULL);
	return e.GetErrorCode();
}
catch (...) {
	MessageBox(NULL, _T("Unexpected error!"), szTitle, NULL);
	return -1;
}


LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
	switch (message) {
		case WM_SIZE:
			if (webviewController != nullptr) {
				RECT bounds;
				if (GetClientRect(hWnd, &bounds)) {
					webviewController->put_Bounds(bounds);
				}
			};
			break;

		case WM_DESTROY:
			PostQuitMessage(0);
			break;

		default:
			return DefWindowProc(hWnd, message, wParam, lParam);
			break;
	}

	return 0;
}
