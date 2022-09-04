#include <string>
#include <memory>
#include <wil/result.h>
#include <steam/isteamfriends.h>
#include "steam.h"

using namespace std;
using namespace wil;

wstring GetExecutableDirectory() {
    wchar_t buffer[MAX_PATH];
    DWORD charsWritten = GetModuleFileName(nullptr, buffer, ARRAYSIZE(buffer));
    THROW_LAST_ERROR_IF(charsWritten == 0 || charsWritten == ARRAYSIZE(buffer));
    wstring executablePath(buffer);
    wstring::size_type lastBackslash = executablePath.find_last_of(L"\\");
    THROW_HR_IF(HRESULT_FROM_WIN32(ERROR_MOD_NOT_FOUND), lastBackslash == wstring::npos);
    return executablePath.substr(0, lastBackslash);
}

wstring GetPathRelativeToExecutable(const wchar_t* relativePath) {
    return GetExecutableDirectory() + L"\\" + relativePath;
}

wstring Widen(const char* multibyteString) {
    int size = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, multibyteString, -1, nullptr, 0);
    unique_ptr<wchar_t[]> buffer = make_unique<wchar_t[]>(size);
    THROW_LAST_ERROR_IF(MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, multibyteString, -1, buffer.get(), size) != size);
    return wstring(buffer.get());
}

Steam::Steam() {
}

STDMETHODIMP Steam::get_UserName(BSTR* stringResult) try {
    wstring name(Widen(SteamFriends()->GetPersonaName()));
    *stringResult = SysAllocString(name.c_str());
    return S_OK;
}
CATCH_RETURN();

// IDispatch
STDMETHODIMP Steam::GetTypeInfoCount(UINT* pctinfo) {
    *pctinfo = 1;
    return S_OK;
}

STDMETHODIMP Steam::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo** ppTInfo) try {
    if (0 != iTInfo) {
        return TYPE_E_ELEMENTNOTFOUND;
    }
    if (!m_typeLib) {
        THROW_IF_FAILED(LoadTypeLib(GetPathRelativeToExecutable(L"sic1.tlb").c_str(), &m_typeLib));
    }
    return m_typeLib->GetTypeInfoOfGuid(__uuidof(ISteam), ppTInfo);
}
CATCH_RETURN();

STDMETHODIMP Steam::GetIDsOfNames(REFIID riid, LPOLESTR* rgszNames, UINT cNames, LCID lcid, DISPID* rgDispId) {
    com_ptr<ITypeInfo> typeInfo;
    RETURN_IF_FAILED(GetTypeInfo(0, lcid, &typeInfo));
    return typeInfo->GetIDsOfNames(rgszNames, cNames, rgDispId);
}

STDMETHODIMP Steam::Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS* pDispParams, VARIANT* pVarResult, EXCEPINFO* pExcepInfo, UINT* puArgErr) {
    com_ptr<ITypeInfo> typeInfo;
    RETURN_IF_FAILED(GetTypeInfo(0, lcid, &typeInfo));
    return typeInfo->Invoke(this, dispIdMember, wFlags, pDispParams, pVarResult, pExcepInfo, puArgErr);
}
