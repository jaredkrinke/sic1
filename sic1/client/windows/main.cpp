#include "stdafx.h"

#include <wrl.h>
#include <wil/com.h>
#include <shlobj_core.h>
#include <shellapi.h>

#include <steam/steam_api.h>
#include "WebView2.h"
#include "WebView2EnvironmentOptions.h"

#include "resource.h"
#include "steam.h"
#include "utils.h"
#include "common.h"
#include "wvwindow.h"

#ifdef _DEBUG
#define ENABLE_DEV_TOOLS TRUE
#define SIC1_DEBUG_FLAG L"?debug=1"
#else
#define ENABLE_DEV_TOOLS FALSE
#define SIC1_DEBUG_FLAG L""
#endif

#define SIC1_DOMAIN L"sic1-assets.schemescape.com"
#define SIC1_ROOT (L"https://" SIC1_DOMAIN L"/index.html" SIC1_DEBUG_FLAG)

#define ERROR_STRING_NO_WEBVIEW2 "WebView2 runtime is not installed!\n\nReinstall SIC-1 or manually install the WebView2 runtime from the following link (note: you can use Ctrl+C to copy this text):\n\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703"

using namespace Microsoft::WRL;
using namespace wil;

static TCHAR szWindowClass[] = L"DesktopApp";
static TCHAR szTitle[] = L"SIC-1";
static com_ptr<ICoreWebView2Controller> webViewController;
static com_ptr<ICoreWebView2> webView;
static com_ptr<ISteam> steam;
static com_ptr<WebViewWindow> webViewWindow;
static PresentationSettings presentationSettings;

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

unique_cotaskmem_string GetDataPath(const wchar_t* folder) {
	unique_cotaskmem_string localAppDataFolder;
	THROW_IF_FAILED_MSG(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &localAppDataFolder), "Could not find Saved Games folder!");
	return str_printf<unique_cotaskmem_string>(L"%s\\SIC-1\\%s", localAppDataFolder.get(), folder);
}

unique_cotaskmem_string GetLocalStorageDataFileName() {
	return GetDataPath(L"cloud.txt");
}

std::wstring LoadLocalStorageData() {
	std::wstring result;
	File::TryReadAllTextUtf8(GetLocalStorageDataFileName().get(), result);
	return result;
}

void SaveLocalStorageData(const wchar_t* localStorageData) {
	File::TryWriteAllTextUtf8(GetLocalStorageDataFileName().get(), localStorageData);
}

const PresentationSettings defaultPresentationSettings = {
	0,		// fullscreen
	1.0,	// zoom
	1,		// soundEffects
	1.0,	// soundVolume
	1,		// music
	1.0,	// musicVolume
};

const Ini::StructIniField presentationSettingsFields[] = {
	{ L"fullscreen", Ini::StructIniFieldType::Int32, offsetof(PresentationSettings, fullscreen) },
	{ L"zoom", Ini::StructIniFieldType::Double, offsetof(PresentationSettings, zoom) },
	{ L"soundEffects", Ini::StructIniFieldType::Int32, offsetof(PresentationSettings, soundEffects) },
	{ L"soundVolume", Ini::StructIniFieldType::Double, offsetof(PresentationSettings, soundVolume) },
	{ L"music", Ini::StructIniFieldType::Int32, offsetof(PresentationSettings, music) },
	{ L"musicVolume", Ini::StructIniFieldType::Double, offsetof(PresentationSettings, musicVolume) },
};

unique_cotaskmem_string GetPresentationSettingsFileName() {
	return GetDataPath(L"settings.ini");
}

PresentationSettings LoadPresentationSettings() {
	PresentationSettings settings = defaultPresentationSettings;
	if (!Ini::IniToStruct(GetPresentationSettingsFileName().get(), &settings, presentationSettingsFields, ARRAYSIZE(presentationSettingsFields))) {
		return defaultPresentationSettings;
	}
	return settings;
}

void SavePresentationSettings(PresentationSettings settings) {
	Ini::StructToIni(&settings, GetPresentationSettingsFileName().get(), presentationSettingsFields, ARRAYSIZE(presentationSettingsFields));
}

// Default window size
typedef struct {
	int width;
	int height;
} WindowSize;

const WindowSize defaultWindowBounds = { 1600, 900 };

WindowSize GetReasonableWindowSizeForWindow(HWND hwnd) {
	WindowSize bounds = defaultWindowBounds;
	MONITORINFO monitor_info = { sizeof(monitor_info) };
	if (GetMonitorInfo(MonitorFromWindow(hwnd, MONITOR_DEFAULTTOPRIMARY), &monitor_info)) {
		WindowSize monitorBounds = { monitor_info.rcMonitor.right - monitor_info.rcMonitor.left, monitor_info.rcMonitor.bottom - monitor_info.rcMonitor.top };
		if (monitorBounds.width < 1680 || monitorBounds.height < 1050) {
			// Monitor is kind of small; make sure the window fits
			bounds.width = monitorBounds.width * 95 / 100;
			bounds.height = monitorBounds.height * 95 / 100;
		}
		else if (monitorBounds.width > 1920 && monitorBounds.height > 1080) {
			// Monitor is big (probably high DPI); set to 16:9 at 80% of the smaller dimension
			if ((100 * monitorBounds.width / monitorBounds.height) > (100 * 16 / 9)) {
				// Wider than 16:9; use height as the deciding dimension
				bounds.height = monitorBounds.height * 80 / 100;
				bounds.width = bounds.height * 16 / 9;
			}
			else {
				// Use width as the deciding dimension
				bounds.width = monitorBounds.width * 80 / 100;
				bounds.height = bounds.width * 9 / 16;
			}
		}
	}
	return bounds;
}

void ScaleWindowIfNeeded(HWND hwnd) {
	WindowSize desired = GetReasonableWindowSizeForWindow(hwnd);
	if (desired.width != defaultWindowBounds.width || desired.height != defaultWindowBounds.height) {
		SetWindowPos(hwnd, nullptr, 0, 0, desired.width, desired.height, SWP_NOMOVE | SWP_NOOWNERZORDER | SWP_NOZORDER);
	}
}

int CALLBACK WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) noexcept try {
	// Pre-load localStorage data
	std::wstring loadedLocalStorageData = LoadLocalStorageData();
	presentationSettings = LoadPresentationSettings();

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

	// Attempt to use a solid black background to minimize white flashes when resizing
	unique_hbrush solidBlack(CreateSolidBrush(RGB(0, 0, 0)));
	if (solidBlack) {
		wcex.hbrBackground = solidBlack.get();
	}

	HWND hWnd = nullptr;
	THROW_LAST_ERROR_IF_MSG(RegisterClassEx(&wcex) == 0, "RegisterClassEx failed!");
	THROW_LAST_ERROR_IF_NULL_MSG(hWnd = CreateWindow(szWindowClass, szTitle, WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, defaultWindowBounds.width, defaultWindowBounds.height, NULL, NULL, hInstance, NULL), "CreateWindow failed!");

	ShowWindow(hWnd, nCmdShow);

	if (!presentationSettings.fullscreen) {
		ScaleWindowIfNeeded(hWnd);
	}

	UpdateWindow(hWnd);

	// Store user data in %LocalAppData%\SIC-1
	auto userDataFolder = GetDataPath(L"internal");

	// Allow sound/music without a user gesture
	auto webView2Options = Make<CoreWebView2EnvironmentOptions>();
	webView2Options->put_AdditionalBrowserArguments(L"--autoplay-policy=no-user-gesture-required");

	// Create the web view
	THROW_IF_FAILED_MSG(CreateCoreWebView2EnvironmentWithOptions(nullptr, userDataFolder.get(), webView2Options.Get(),
		Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
			[hWnd, &loadedLocalStorageData](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
				try {
					THROW_IF_FAILED_MSG(result, "Failed to create WebView2 environment!");
					env->CreateCoreWebView2Controller(hWnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
						[hWnd, &loadedLocalStorageData](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
							try {
								THROW_HR_IF_NULL_MSG(result, controller, "Failed to create WebView2 controller!");

								webViewController = controller;
								THROW_IF_FAILED_MSG(webViewController->get_CoreWebView2(&webView), "Failed to get CoreWebView2!");

								// Set bounds
								RECT bounds;
								GetClientRect(hWnd, &bounds);
								webViewController->put_Bounds(bounds);

								// Set focus, so escape key starts working immediately
								webViewController->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);

								// Disable dev tools, default context menu, and browser hotkeys
								com_ptr<ICoreWebView2Settings> settings;
								THROW_IF_FAILED_MSG(webView->get_Settings(&settings), "Failed to get CoreWebView2Settings!");
								THROW_IF_FAILED_MSG(settings->put_AreDevToolsEnabled(ENABLE_DEV_TOOLS), "Failed to disable dev tools!");
								com_ptr<ICoreWebView2Settings3> settings3 = settings.query<ICoreWebView2Settings3>();
								THROW_IF_FAILED_MSG(settings3->put_AreDefaultContextMenusEnabled(ENABLE_DEV_TOOLS), "Failed to disable context menus!");
								THROW_IF_FAILED_MSG(settings3->put_AreBrowserAcceleratorKeysEnabled(FALSE), "Failed to disable browser hotkeys!");

								// Open the default browser for new windows
								THROW_IF_FAILED_MSG(webView->add_NewWindowRequested(Callback<ICoreWebView2NewWindowRequestedEventHandler>(
									[](ICoreWebView2* sender, ICoreWebView2NewWindowRequestedEventArgs* args) -> HRESULT {
										try {
											// Never actually open a window within this app
											args->put_Handled(TRUE);

											unique_cotaskmem_string uri;
											THROW_IF_FAILED(args->get_Uri(&uri));

											// Very strange contract: https://docs.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecutea
											THROW_HR_IF(E_FAIL, !(reinterpret_cast<INT_PTR>(ShellExecute(nullptr, L"open", uri.get(), nullptr, nullptr, 0)) > 32));
											return S_OK;
										}
										CATCH_RETURN();
									}).Get(), nullptr), "Failed to add new window event handler!");

								// Handle window.close() by closing the Win32 window
								THROW_IF_FAILED_MSG(webView->add_WindowCloseRequested(Callback<ICoreWebView2WindowCloseRequestedEventHandler>(
									[hWnd](ICoreWebView2* sender, IUnknown* args) {
										RETURN_IF_WIN32_BOOL_FALSE(PostMessage(hWnd, WM_CLOSE, 0, 0));
										return S_OK;
									}).Get(), nullptr), "Failed to setup window.close() handler!");

								// Expose native wrappers on navigation start
								steam = Make<Steam>();
								webViewWindow = Make<WebViewWindow>(hWnd, &presentationSettings);

								// Provide any loaded localStorage data
								if (!loadedLocalStorageData.empty()) {
									THROW_IF_FAILED_MSG(webViewWindow->put_LocalStorageDataString(make_bstr(loadedLocalStorageData.c_str()).get()), "Failed to provide loaded localStorage data string!");
								}

								THROW_IF_FAILED_MSG(webView->add_NavigationStarting(Microsoft::WRL::Callback<ICoreWebView2NavigationStartingEventHandler>(
									[](ICoreWebView2* sender, ICoreWebView2NavigationStartingEventArgs* args) -> HRESULT
									{
										try {
											struct {
												const wchar_t* name;
												com_ptr<IDispatch> nativeObject;
											} table[] = {
												{ L"steam", steam.query<IDispatch>() },
												{ HOST_OBJECT_WEBVIEWWINDOW_NAME, webViewWindow.query<IDispatch>() },
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

								// Initial navigation
								THROW_IF_FAILED_MSG(webView->Navigate(SIC1_ROOT), "Failed to navigate!");

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
		case WM_CLOSE:
			try {
				webViewWindow->OnClosing(webView, [hWnd](bool presentationSettingsModified) {
					unique_bstr localStorageDataString;
					THROW_IF_FAILED(webViewWindow->get_LocalStorageDataString(&localStorageDataString));
					if (localStorageDataString) {
						SaveLocalStorageData(localStorageDataString.get());
					}

					if (presentationSettingsModified) {
						SavePresentationSettings(presentationSettings);
					}

					DestroyWindow(hWnd);
				});
			}
			CATCH_LOG();
			break;

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
