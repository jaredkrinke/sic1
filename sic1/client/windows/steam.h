#pragma once

#include <vector>
#include <memory>
#include <map>
#include <steam/steam_api.h>
#include "steam/isteamuserstats.h"
#include "dispatchable.h"
#include "utils.h"
#include "host-objects_h.h"
#include "steamcallmanager.h"

class Steam : public Dispatchable<ISteam> {
public:
    Steam();

    STDMETHODIMP get_UserName(BSTR* stringResult) override;

    STDMETHODIMP GetLeaderboardAsync(BSTR leaderboardName, UINT32* leaderboardHandle);
    STDMETHODIMP SetLeaderboardEntryAsync(UINT32 leaderboardHandle, INT32 score, VARIANT* detailBytes, BOOL* changed);

private:
    SteamCallManager m_callManager;

    // Steam Leaderboard handles are uint64, so map them to small numbers for use in JavaScript (where the number type
    // is a double). The JavaScript-side handles are just the offset+1 in m_leaderboardHandleMapping.
    Sync::CriticalSection m_leaderboardHandleMappingLock;
    std::vector<SteamLeaderboard_t> m_leaderboardHandleMapping;
    std::map<std::string, unsigned int> m_leaderboardNameToJSHandle;

    SteamLeaderboard_t GetLeaderboardNativeHandle(unsigned int jsHandle);
};
