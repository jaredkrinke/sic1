#include <windows.h>
#include <tchar.h>
#include <wrl.h>
#include <wil/com.h>
#include <shlobj_core.h>
#include <steam/steam_api.h>
#include "WebView2.h"
#include "steam.h"
#include "wvwindow.h"
#include "resource.h"

#define SIC1_DOMAIN L"sic1-assets.schemescape.com"
#define SIC1_ROOT (L"https://" SIC1_DOMAIN L"/index.html")

#define ERROR_STRING_NO_WEBVIEW2 "WebView2 runtime is not installed!\n\nReinstall SIC-1 or manually install the WebView2 runtime from the following link (note: you can use Ctrl+C to copy this text):\n\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703"

using namespace Microsoft::WRL;
using namespace wil;

static TCHAR szWindowClass[] = L"DesktopApp";
static TCHAR szTitle[] = L"SIC-1";
static com_ptr<ICoreWebView2Controller> webViewController;
static com_ptr<ICoreWebView2> webView;
static com_ptr<ISteam> steam;
static com_ptr<IWebViewWindow> webViewWindow;

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

int CALLBACK WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) noexcept try {
	// Check for WebView2 runtime first
	{
		unique_cotaskmem_string versionInfo;
		THROW_IF_FAILED_MSG(GetAvailableCoreWebView2BrowserVersionString(nullptr, &versionInfo), ERROR_STRING_NO_WEBVIEW2);
		THROW_HR_IF_NULL_MSG(E_NOINTERFACE, versionInfo, ERROR_STRING_NO_WEBVIEW2);
	}

	// Initialize Steam API
	THROW_HR_IF_MSG(E_FAIL, !SteamAPI_Init(), "Failed to initialize Steam API!");

	// Create and show a window
	WNDCLASSEX wcex;
	wcex.cbSize = sizeof(WNDCLASSEX);
	wcex.style = CS_HREDRAW | CS_VREDRAW;
	wcex.lpfnWndProc = WndProc;
	wcex.cbClsExtra = 0;
	wcex.cbWndExtra = 0;
	wcex.hInstance = hInstance;
	wcex.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_ICON1));
	wcex.hCursor = LoadCursor(NULL, IDC_ARROW);
	wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
	wcex.lpszMenuName = NULL;
	wcex.lpszClassName = szWindowClass;
	wcex.hIconSm = NULL;

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
				try {
					THROW_IF_FAILED_MSG(result, "Failed to create WebView2 environment!");
					env->CreateCoreWebView2Controller(hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
						[hWnd](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
							try {
								THROW_HR_IF_NULL_MSG(result, controller, "Failed to create WebView2 controller!");

								webViewController = controller;
								THROW_IF_FAILED_MSG(webViewController->get_CoreWebView2(&webView), "Failed to get CoreWebView2!");

								// Disable dev tools, default context menu, and browser hotkeys
								com_ptr<ICoreWebView2Settings> settings;
								THROW_IF_FAILED_MSG(webView->get_Settings(&settings), "Failed to get CoreWebView2Settings!");
								THROW_IF_FAILED_MSG(settings->put_AreDevToolsEnabled(FALSE), "Failed to disable dev tools!");
								com_ptr<ICoreWebView2Settings3> settings3 = settings.query<ICoreWebView2Settings3>();
								THROW_IF_FAILED_MSG(settings3->put_AreDefaultContextMenusEnabled(FALSE), "Failed to disable context menus!");
								THROW_IF_FAILED_MSG(settings3->put_AreBrowserAcceleratorKeysEnabled(FALSE), "Failed to disable browser hotkeys!");

								RECT bounds;
								GetClientRect(hWnd, &bounds);
								webViewController->put_Bounds(bounds);

								// Handle window.close() by closing the Win32 window
								THROW_IF_FAILED_MSG(webView->add_WindowCloseRequested(Callback<ICoreWebView2WindowCloseRequestedEventHandler>(
									[hWnd](ICoreWebView2* sender, IUnknown* args) {
										RETURN_IF_WIN32_BOOL_FALSE(PostMessage(hWnd, WM_CLOSE, 0, 0));
										return S_OK;
									}).Get(), nullptr), "Failed to setup window.close() handler!");

								// Expose native wrappers on navigation start
								steam = Make<Steam>();
								webViewWindow = Make<WebViewWindow>(hWnd);
								THROW_IF_FAILED_MSG(webView->add_NavigationStarting(Microsoft::WRL::Callback<ICoreWebView2NavigationStartingEventHandler>(
									[](ICoreWebView2* sender, ICoreWebView2NavigationStartingEventArgs* args) -> HRESULT
									{
										try {
											struct {
												const wchar_t* name;
												com_ptr<IDispatch> nativeObject;
											} table[] = {
												{ L"steam", steam.query<IDispatch>() },
												{ L"webViewWindow", webViewWindow.query<IDispatch>() },
											};

											for (const auto& row : table) {
												VARIANT variant = {};
												row.nativeObject.copy_to(&variant.pdispVal);
												variant.vt = VT_DISPATCH;
												THROW_IF_FAILED_MSG(webView->AddHostObjectToScript(row.name, &variant), "Failed to add native object %ws!", row.name);
											}
											return S_OK;
										}
										CATCH_RETURN();
									}).Get(), nullptr), "Failed to hook navigation starting evemt!");

								// Reference SIC-1 assets
								auto webView3 = webView.query<ICoreWebView2_3>();
								THROW_IF_FAILED_MSG(webView3->SetVirtualHostNameToFolderMapping(SIC1_DOMAIN, L"assets", COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW), "Failed to setup folder mapping!");

								// Indicate that this is using the "steam" platform (note: this is executed asynchronously!)
								THROW_IF_FAILED_MSG(webView->AddScriptToExecuteOnDocumentCreated(L"globalThis.__platformString = \"steam\";", Microsoft::WRL::Callback<ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler>(
									[](HRESULT hr, LPCWSTR id) -> HRESULT
									{
										try {
											THROW_IF_FAILED_MSG(hr, "Failed to execute platform string function!");

											// Initial navigation
											THROW_IF_FAILED_MSG(webView->Navigate(SIC1_ROOT), "Failed to navigate!");
											return S_OK;
										}
										CATCH_RETURN();
									}).Get()), "Failed to set platform string!");

								return S_OK;
							}
							CATCH_RETURN();
						}).Get());
					return S_OK;
				}
				CATCH_RETURN();
			}).Get()), "CreateCoreWebView2EnvironmentWithOptions failed!");

	// Main message loop:
	MSG msg;
	while (GetMessage(&msg, NULL, 0, 0)) {
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}

	SteamAPI_Shutdown();

	return (int)msg.wParam;
}
catch (const ResultException& e) {
	auto message = str_printf<unique_cotaskmem_string>(L"%s\n\nError code: 0x%08x", e.GetFailureInfo().pszMessage, e.GetErrorCode());
	MessageBox(NULL, message.get(), szTitle, NULL);
	return e.GetErrorCode();
}
catch (...) {
	MessageBox(NULL, L"Unexpected error!", szTitle, NULL);
	return -1;
}


LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
	switch (message) {
		case WM_SIZE:
			if (webViewController != nullptr) {
				RECT bounds;
				if (GetClientRect(hWnd, &bounds)) {
					webViewController->put_Bounds(bounds);
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
