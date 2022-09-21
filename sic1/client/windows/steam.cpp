#include "stdafx.h"

#include <string>
#include <wil/result.h>
#include <steam/isteamfriends.h>
#include "steam.h"
#include "utils.h"

using namespace std;
using namespace wil;

Steam::Steam() {
}

SteamLeaderboard_t Steam::GetLeaderboardNativeHandle(unsigned int jsHandle) {
    auto lock = m_leaderboardHandleMappingLock.Lock();
    return m_leaderboardHandleMapping[jsHandle - 1];
}

STDMETHODIMP Steam::get_UserName(BSTR* stringResult) try {
    wstring name(String::Widen(SteamFriends()->GetPersonaName()));
    *stringResult = SysAllocString(name.c_str());
    return S_OK;
}
CATCH_RETURN();

STDMETHODIMP Steam::GetLeaderboardAsync(BSTR leaderboardName, UINT32* leaderboardHandle) try {
    *leaderboardHandle = 0;

    const auto name = String::Narrow(leaderboardName);

    {
        auto lock = m_leaderboardHandleMappingLock.Lock();
        const auto existingEntry = m_leaderboardNameToJSHandle.find(name);
        if (existingEntry != m_leaderboardNameToJSHandle.end()) {
            *leaderboardHandle = existingEntry->second;
            return S_OK;
        }
    }

    const auto nativeHandle = m_callManager.GetLeaderboard(name.c_str());

    {
        auto lock = m_leaderboardHandleMappingLock.Lock();
        m_leaderboardHandleMapping.push_back(nativeHandle);
        const unsigned int jsHandle = static_cast<unsigned int>(m_leaderboardHandleMapping.size());

        m_leaderboardNameToJSHandle[name] = jsHandle;
        *leaderboardHandle = jsHandle;
    }

    return S_OK;
}
CATCH_RETURN();

STDMETHODIMP Steam::SetLeaderboardEntryAsync(UINT32 jsHandle, INT32 score, VARIANT* detailBytes, BOOL* changed) try {
    *changed = FALSE;

    // Check array types and extract into a vector
    THROW_HR_IF(E_INVALIDARG, (detailBytes->vt != (VT_ARRAY | VT_VARIANT)) || (detailBytes->parray->cDims != 1) || detailBytes->parray->rgsabound[0].cElements > 256);

    // Pack bytes into int32s
    std::vector<int> packedBytes;
    unsigned int tmp = 0;
    int tmpIndex = 0;
    Ole::SafeArrayAccessor<VARIANT> array(detailBytes->parray);
    for (size_t i = 0; i < array.Count(); i++) {
        const VARIANT* element = &array.Get()[i];
        THROW_HR_IF(E_INVALIDARG, element->vt != VT_I4 || element->lVal >= 256 || element->lVal < 0);
        unsigned char byte = static_cast<unsigned char>(element->lVal);
        tmp |= (byte << ((tmpIndex++) * 8));

        if (tmpIndex == 4 || i == (array.Count() - 1)) {
            int packed = 0;
            memcpy(&packed, &tmp, sizeof(int));
            packedBytes.push_back(packed);
            tmpIndex = 0;
            tmp = 0;
        }
    }

    SteamLeaderboard_t nativeHandle = GetLeaderboardNativeHandle(jsHandle);
    *changed = m_callManager.SetLeaderboardEntry(nativeHandle, score, packedBytes.data(), static_cast<int>(packedBytes.size())) ? TRUE : FALSE;

    return S_OK;
}
CATCH_RETURN();
