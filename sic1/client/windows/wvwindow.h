#pragma once

#include <functional>
#include <wil/com.h>
#include "WebView2.h"
#include "host-objects_h.h"
#include "dispatchable.h"
#include "common.h"

#define HOST_OBJECT_WEBVIEWWINDOW_NAME L"webViewWindow"

class WebViewWindow : public Dispatchable<IWebViewWindow> {
public:
    WebViewWindow(HWND hWnd, PresentationSettings* presentationSettings);

    // IWebViewWindow
    STDMETHODIMP get_Fullscreen(BOOL* fullscreen) override;
    STDMETHODIMP put_Fullscreen(BOOL fullscreen) override;

    STDMETHODIMP get_LocalStorageDataString(BSTR* localStorageData) override;
    STDMETHODIMP put_LocalStorageDataString(BSTR localStorageData) override;

    STDMETHODIMP get_OnClosing(IDispatch** callback) override;
    STDMETHODIMP put_OnClosing(IDispatch* callback) override;

    STDMETHODIMP GetPresentationSetting(BSTR name, VARIANT* data) override;
    STDMETHODIMP SetPresentationSetting(BSTR name, VARIANT data) override;

    // Internal helpers
    void OnClosing(const wil::com_ptr<ICoreWebView2> coreWebView2, std::function<void(bool)> callback) noexcept(false);

private:
    HWND m_hWnd;
    bool m_fullscreen;
    RECT m_preFullscreenBounds;
    wil::unique_cotaskmem_string m_localStorageDataString;
    wil::com_ptr<IDispatch> m_onClosingCallback;

    // Presentation settings
    PresentationSettings* m_presentationSettings;
    bool m_presentationSettingsModified;
};
