#pragma once

#include "dispatchable.h"
#include "host-objects_h.h"

class WebViewWindow : public Dispatchable<IWebViewWindow> {
public:
    WebViewWindow(HWND hWnd);

    STDMETHODIMP get_Fullscreen(BOOL* fullscreen) override;
    STDMETHODIMP put_Fullscreen(BOOL fullscreen) override;

private:
    bool m_fullscreen;
    HWND m_hWnd;
    RECT m_preFullscreenBounds;
};
