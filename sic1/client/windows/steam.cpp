#include "stdafx.h"

#include <string>
#include <wil/result.h>
#include <steam/isteamfriends.h>
#include "steam.h"
#include "utils.h"
#include "promisehandler.h"

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

STDMETHODIMP Steam::ResolveGetLeaderboard(VARIANT resolve, VARIANT reject, BSTR leaderboardNameIn) try {
    wil::shared_bstr leaderboardName(wilx::make_unique_bstr(leaderboardNameIn));

    Promise::ExecutePromiseOnThreadPool(resolve, reject, std::make_shared<Promise::Handler>(
        [this, leaderboardName](VARIANT* result)
        {
            result->vt = VT_UI4;
            result->ulVal = 0;

            const auto name = String::Narrow(leaderboardName.get());

            {
                auto lock = m_leaderboardHandleMappingLock.Lock();
                const auto existingEntry = m_leaderboardNameToJSHandle.find(name);
                if (existingEntry != m_leaderboardNameToJSHandle.end()) {
                    result->ulVal = existingEntry->second;
                    return;
                }
            }

            const auto nativeHandle = m_callManager.GetLeaderboard(name.c_str());

            {
                auto lock = m_leaderboardHandleMappingLock.Lock();
                m_leaderboardHandleMapping.push_back(nativeHandle);
                const unsigned int jsHandle = static_cast<unsigned int>(m_leaderboardHandleMapping.size());

                m_leaderboardNameToJSHandle[name] = jsHandle;
                result->ulVal = jsHandle;
            }
        }
    ));
    return S_OK;
}
CATCH_RETURN();

STDMETHODIMP Steam::ResolveSetLeaderboardEntry(VARIANT resolve, VARIANT reject, UINT32 jsHandle, INT32 score, VARIANT detailBytesIn) try {
    std::shared_ptr<wil::unique_variant> detailBytes = std::make_shared<wil::unique_variant>();
    THROW_IF_FAILED(VariantCopy(detailBytes->addressof(), &detailBytesIn));

    Promise::ExecutePromiseOnThreadPool(resolve, reject, std::make_shared<Promise::Handler>(
        [this, jsHandle, score, detailBytes](VARIANT* result)
        {
            result->vt = VT_BOOL;
            result->boolVal = VARIANT_FALSE;

            // Note: Details are optional!
            int* details = nullptr;
            int detailsSize = 0;

            std::vector<int> packedBytes;
            if (detailBytes->vt != VT_EMPTY) {
                // Check array types and extract into a vector
                THROW_HR_IF(E_INVALIDARG, (detailBytes->vt != (VT_ARRAY | VT_VARIANT)) || (detailBytes->parray->cDims != 1) || detailBytes->parray->rgsabound[0].cElements > 256);

                // Pack bytes into int32s
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

                details = packedBytes.data();
                detailsSize = static_cast<int>(packedBytes.size());
            }

            SteamLeaderboard_t nativeHandle = GetLeaderboardNativeHandle(jsHandle);
            result->boolVal = m_callManager.SetLeaderboardEntry(nativeHandle, score, details, detailsSize) ? VARIANT_TRUE : VARIANT_FALSE;
        }
    ));
    return S_OK;
}
CATCH_RETURN();

STDMETHODIMP Steam::ResolveGetFriendLeaderboardEntries(VARIANT resolve, VARIANT reject, UINT32 jsHandle) try {
    Promise::ExecutePromiseOnThreadPool(resolve, reject, std::make_shared<Promise::Handler>(
        [this, jsHandle](VARIANT* flatArray)
        {
            SteamLeaderboard_t nativeHandle = GetLeaderboardNativeHandle(jsHandle);
            auto rows = m_callManager.GetFriendLeaderboardEntries(nativeHandle);

            SAFEARRAYBOUND bounds;
            bounds.lLbound = 0;
            bounds.cElements = 2 * static_cast<ULONG>(rows.size());
            wilx::unique_safearray array = wilx::make_unique_safearray(VT_VARIANT, 1, &bounds);
            LONG index = 0;
            for (const auto& row : rows) {
                // Create an array for this row and fill in the values [name, score]
                unique_variant name;
                name.bstrVal = wilx::make_unique_bstr(String::Widen(row.name.c_str()).c_str()).release();
                name.vt = VT_BSTR;
                THROW_IF_FAILED(SafeArrayPutElement(array.get(), &index, reinterpret_cast<void*>(&name)));
                ++index;

                unique_variant score;
                score.vt = VT_I4;
                score.lVal = row.score;
                THROW_IF_FAILED(SafeArrayPutElement(array.get(), &index, reinterpret_cast<void*>(&score)));
                ++index;
            }

            flatArray->vt = VT_ARRAY | VT_VARIANT;
            flatArray->parray = array.release();
        }
    ));

    return S_OK;
}
CATCH_RETURN();

STDMETHODIMP Steam::ResolveSetAchievement(VARIANT resolve, VARIANT reject, BSTR achievementIdIn) try {
    wil::shared_bstr achievementId(wilx::make_unique_bstr(achievementIdIn));
    Promise::ExecutePromiseOnThreadPool(resolve, reject, std::make_shared<Promise::Handler>(
        [this, achievementId](VARIANT* result)
        {
            // Note: This does not wait for persistence; it's async just because there's no need to run synchronously
            m_callManager.SetAchievement(String::Narrow(achievementId.get()).c_str());
        }
    ));
    return S_OK;
}
CATCH_RETURN();
