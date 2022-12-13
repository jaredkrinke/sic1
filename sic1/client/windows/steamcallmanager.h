#pragma once

#include <vector>
#include <functional>
#include <wil/resource.h>
#include <steam/steam_api.h>
#include "steam/isteamuserstats.h"
#include "utils.h"

class SteamCallManager;

// Helper class for serializing a specific Steam API call that returns a Call Result
template<typename TSteamResult, typename TState, typename TResult, typename ...TArgs>
class SteamCall {
public:
    SteamCall(SteamCallManager* parent, std::function<SteamAPICall_t(TArgs...)> start, std::function<void(TSteamResult*, TState*)> translateResult)
        : m_parent(parent), m_start(start), m_translateResult(translateResult), m_state(nullptr) {
    }

    ~SteamCall() {
        // Note: This isn't meticulously synchronized and doesn't update the outstanding call count because
        // SteamAPI_RunCallbacks won't be called again in the caller anyway
        if (m_state != nullptr) {
            m_state->hr = E_ABORT;
        }
        m_completed.Signal();
    }

    // (Hopefully) Thread-safe, serialized, synchronous call to Steam API
    TResult Call(TArgs...args) {
        auto lock = m_lock.Lock();

        SteamAPICall_t call = m_start(args...);
        auto state = std::make_unique<TState>();
        m_state = state.get();

        m_callResult.Set(call, this, &SteamCall<TSteamResult, TState, TResult, TArgs...>::OnCallback);
        m_parent->IncrementOutstandingCallCount();
        m_completed.Wait();

        THROW_IF_FAILED(state->hr);

        return state->data;
    }

private:
    // Call result callback
    void OnCallback(TSteamResult* result, bool ioFailed) {
        auto onScopeExit = wil::scope_exit([&] {
            m_parent->DecrementOutstandingCallCount();
            m_completed.Signal();
        });

        if (ioFailed) {
            m_state->hr = HRESULT_FROM_WIN32(ERROR_NETWORK_NOT_AVAILABLE);
            return;
        }

        m_state->hr = S_OK;
        m_translateResult(result, m_state);
    }

    SteamCallManager* m_parent;

    // Functions for calling the Steam API and processing the result
    std::function<SteamAPICall_t(TArgs...)> m_start;
    std::function<void(TSteamResult*, TState*)> m_translateResult;

    // Synchronization and state
    Sync::CriticalSection m_lock;
    CCallResult<SteamCall<TSteamResult, TState, TResult, TArgs...>, TSteamResult> m_callResult;
    TState* m_state;
    Sync::AutoResetEvent m_completed;
};

typedef struct {
    HRESULT hr;
    SteamLeaderboard_t data;
} GetLeaderboardState;

typedef struct {
    HRESULT hr;
    bool data;
} SetLeaderboardEntryState;

typedef struct {
    std::string name;
    int score;
} FriendLeaderboardRow;

typedef struct {
    HRESULT hr;
    std::vector<FriendLeaderboardRow> data;
} GetFriendLeaderboardEntriesState;

class SteamCallManager {
public:
    const DWORD pollingPeriodMS = 200;

    SteamCallManager();
    ~SteamCallManager();

    // Called by SteamCall<...> helpers
    unsigned int GetOutstandingCallCount();
    void IncrementOutstandingCallCount();
    void DecrementOutstandingCallCount();

    // SteamCallManager thread function
    void RunThread();

    // Synchronous (serialized) calls
    SteamLeaderboard_t GetLeaderboard(const char* name);
    std::vector<FriendLeaderboardRow> GetFriendLeaderboardEntries(SteamLeaderboard_t nativeHandle);
    bool SetLeaderboardEntry(SteamLeaderboard_t nativeHandle, int score, int* scoreDetails, int scoreDetailsCount);

    // Achievements
    bool GetAchievement(const char* achievementId);
    bool SetAchievement(const char* achievementId);
    void StoreAchievements();

    STEAM_CALLBACK(SteamCallManager, OnUserStatsReceived, UserStatsReceived_t, m_callbackUserStatsReceived);
    STEAM_CALLBACK(SteamCallManager, OnUserStatsStored, UserStatsStored_t, m_callbackUserStatsStored);
    STEAM_CALLBACK(SteamCallManager, OnAchievementStored, UserAchievementStored_t, m_callbackAchievementStored);

private:
    wil::unique_handle m_thread;
    Sync::AutoResetEvent m_shutdown;

    Sync::ThreadSafeCounter m_outstandingCalls;
    Sync::AutoResetEvent m_startProcessing;

    bool m_achievementsInitialized;

    SteamCall<LeaderboardFindResult_t, GetLeaderboardState, SteamLeaderboard_t, const char*> m_getLeaderboard;
    SteamCall<LeaderboardScoresDownloaded_t, GetFriendLeaderboardEntriesState, std::vector<FriendLeaderboardRow>, SteamLeaderboard_t> m_getFriendLeaderboardEntries;
    SteamCall<LeaderboardScoreUploaded_t, SetLeaderboardEntryState, bool, SteamLeaderboard_t, int, int*, int> m_setLeaderboardEntry;
};
