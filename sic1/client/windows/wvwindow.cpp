#include "stdafx.h"

#include <wrl.h>
#include <wil/result.h>
#include "wvwindow.h"

typedef struct {
	const wchar_t* fieldName;
	VARTYPE vt;
	size_t sOffset;
	size_t vOffset;
	size_t size;
} PresentationSettingsField;

const PresentationSettingsField presentationSettingsFields[] = {
	{ L"soundEffects", VT_I4, offsetof(PresentationSettings, soundEffects), offsetof(VARIANT, lVal), sizeof(int) },
	{ L"soundVolume", VT_R8, offsetof(PresentationSettings, soundVolume), offsetof(VARIANT, dblVal), sizeof(double) }
};

inline BOOL boolify(bool b) {
	return b ? TRUE : FALSE;
}

void ForMatchingPresentationSetting(BSTR name, std::function<void(const PresentationSettingsField&)> f) {
	for (const auto& field : presentationSettingsFields) {
		if (CompareStringOrdinal(field.fieldName, -1, name, -1, TRUE) == CSTR_EQUAL) {
			f(field);
			return;
		}
	}

	THROW_HR(TYPE_E_FIELDNOTFOUND);
}

WebViewWindow::WebViewWindow(HWND hWnd, PresentationSettings* presentationSettings)
	: m_fullscreen(false), m_hWnd(hWnd), m_preFullscreenBounds(), m_presentationSettings(presentationSettings), m_presentationSettingsModified(false)
{
}

STDMETHODIMP WebViewWindow::get_Fullscreen(BOOL* fullscreen) {
	*fullscreen = boolify(m_fullscreen);
	return S_OK;
}

STDMETHODIMP WebViewWindow::put_Fullscreen(BOOL fullscreen) {
	if (m_fullscreen != !!fullscreen) {
		// Note: this is best effort
		if (fullscreen) {
			// Entering fullscreen
			MONITORINFO monitor_info = { sizeof(monitor_info) };
			DWORD style = GetWindowLong(m_hWnd, GWL_STYLE);
			if (GetWindowRect(m_hWnd, &m_preFullscreenBounds) && GetMonitorInfo(MonitorFromWindow(m_hWnd, MONITOR_DEFAULTTOPRIMARY), &monitor_info))
			{
				SetWindowLong(m_hWnd, GWL_STYLE, style & ~WS_OVERLAPPEDWINDOW);
				SetWindowPos(m_hWnd, HWND_TOP, monitor_info.rcMonitor.left, monitor_info.rcMonitor.top, monitor_info.rcMonitor.right - monitor_info.rcMonitor.left, monitor_info.rcMonitor.bottom - monitor_info.rcMonitor.top, SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
				m_fullscreen = true;
			}
		}
		else {
			// Exiting fullscreen
			DWORD style = GetWindowLong(m_hWnd, GWL_STYLE);
			SetWindowLong(m_hWnd, GWL_STYLE, style | WS_OVERLAPPEDWINDOW);
			SetWindowPos(m_hWnd, NULL, m_preFullscreenBounds.left, m_preFullscreenBounds.top, m_preFullscreenBounds.right - m_preFullscreenBounds.left, m_preFullscreenBounds.bottom - m_preFullscreenBounds.top, SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
			m_fullscreen = false;
		}
	}
	return S_OK;
}

STDMETHODIMP WebViewWindow::get_LocalStorageDataString(BSTR* localStorageData) try {
	*localStorageData = nullptr;
	if (m_localStorageDataString) {
		*localStorageData = SysAllocString(m_localStorageDataString.get());
	}
	return S_OK;
}
CATCH_RETURN();

STDMETHODIMP WebViewWindow::put_LocalStorageDataString(BSTR localStorageData) try {
	m_localStorageDataString = wil::make_cotaskmem_string(localStorageData);
	return S_OK;
}
CATCH_RETURN();


STDMETHODIMP WebViewWindow::get_OnClosing(IDispatch** callback) try {
	m_onClosingCallback.copy_to(callback);
	return S_OK;
}
CATCH_RETURN();

STDMETHODIMP WebViewWindow::put_OnClosing(IDispatch* callback) try {
	m_onClosingCallback = callback;
	return S_OK;
}
CATCH_RETURN();

STDMETHODIMP WebViewWindow::GetPresentationSetting(BSTR name, VARIANT* data) try {
	VariantInit(data);
	ForMatchingPresentationSetting(name, [&](const PresentationSettingsField& field) {
		data->vt = field.vt;
		memcpy(static_cast<unsigned char*>(static_cast<void*>(data)) + field.vOffset, static_cast<unsigned char*>(static_cast<void*>(m_presentationSettings)) + field.sOffset, field.size);
	});
	return S_OK;
}
CATCH_RETURN();

STDMETHODIMP WebViewWindow::SetPresentationSetting(BSTR name, VARIANT data) try {
	ForMatchingPresentationSetting(name, [&](const PresentationSettingsField& field) {
		if (data.vt != field.vt) {
			THROW_IF_FAILED(VariantChangeType(&data, &data, 0, field.vt));
		}

		memcpy(static_cast<unsigned char*>(static_cast<void*>(m_presentationSettings)) + field.sOffset, static_cast<unsigned char*>(static_cast<void*>(&data)) + field.vOffset, field.size);
		m_presentationSettingsModified = true;
	});
	return S_OK;
}
CATCH_RETURN();

void WebViewWindow::OnClosing(const wil::com_ptr<ICoreWebView2> coreWebView2, std::function<void(bool)> callback) {
	bool presentationSettingsModified = m_presentationSettingsModified;
	if (m_onClosingCallback) {
		// Note: Invoking JavaScript callbacks via IDispatch doesn't support waiting for completion, so use ExecuteScript instead
		THROW_IF_FAILED(coreWebView2->ExecuteScript(L"chrome.webview.hostObjects.sync." HOST_OBJECT_WEBVIEWWINDOW_NAME L".OnClosing()", Microsoft::WRL::Callback<ICoreWebView2ExecuteScriptCompletedHandler>(
			[callback, presentationSettingsModified](HRESULT hr, LPCWSTR resultAsJson) -> HRESULT {
				try {
					THROW_IF_FAILED(hr);
					callback(presentationSettingsModified);
					return S_OK;
				}
				CATCH_RETURN();
			}).Get()));
	}
	else {
		callback(presentationSettingsModified);
	}
}
