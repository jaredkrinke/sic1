#include "stdafx.h"

#include "steamcallmanager.h"

DWORD WINAPI SteamCallManager_ThreadEntryPoint(void* data) try {
    SteamCallManager* steamManager = reinterpret_cast<SteamCallManager*>(data);
    steamManager->RunThread();
    return 0;
}
CATCH_RETURN();

SteamCallManager::SteamCallManager()
    : m_getLeaderboard(this,
        [](const char* name) -> SteamAPICall_t {
            return SteamUserStats()->FindLeaderboard(name);
        },
        [](LeaderboardFindResult_t* result, GetLeaderboardState* state) -> void {
            if (!result->m_bLeaderboardFound) {
                state->hr = HRESULT_FROM_WIN32(ERROR_NOT_FOUND);
            }
            else {
                state->data = result->m_hSteamLeaderboard;
            }
        }),
    m_setLeaderboardEntry(this,
        [](SteamLeaderboard_t nativeHandle, int score, int* scoreDetails, int scoreDetailsCount) -> SteamAPICall_t {
            return SteamUserStats()->UploadLeaderboardScore(nativeHandle, k_ELeaderboardUploadScoreMethodKeepBest, score, scoreDetails, scoreDetailsCount);
        },
        [](LeaderboardScoreUploaded_t* result, SetLeaderboardEntryState* state) -> void {
            if (result->m_bSuccess) {
                state->data = result->m_bScoreChanged;
            }
            else {
                state->hr = E_FAIL;
            }
        })
{
    m_thread.reset(CreateThread(nullptr, 0, &SteamCallManager_ThreadEntryPoint, reinterpret_cast<void*>(this), CREATE_SUSPENDED, nullptr));
    THROW_LAST_ERROR_IF_NULL(m_thread.get());
    THROW_LAST_ERROR_IF(ResumeThread(m_thread.get()) == -1);
}

SteamCallManager::~SteamCallManager() {
    // TODO: There should be a way to signal a desire to shutdown that also fends off any incoming callbacks and also
    // automatically completes any subsequent serialized calls... assuming the threads don't just get killed somehow
    // anyway...

    m_shutdown.Signal();
    DWORD result = WaitForSingleObject(m_thread.get(), INFINITE);
    THROW_LAST_ERROR_IF(result == WAIT_FAILED);

    DWORD threadResult;
    THROW_LAST_ERROR_IF(!GetExitCodeThread(m_thread.get(), &threadResult));
    THROW_IF_FAILED(static_cast<HRESULT>(threadResult));
}

unsigned int SteamCallManager::GetOutstandingCallCount() {
    return m_outstandingCalls.Get();
}

void SteamCallManager::IncrementOutstandingCallCount() {
    if (m_outstandingCalls.Increment() == 1) {
        // First outstanding call; kick off processing now
        m_startProcessing.Signal();
    }
}

void SteamCallManager::DecrementOutstandingCallCount() {
    m_outstandingCalls.Decrement();
}

void SteamCallManager::RunThread() {
    while (true) {
        std::vector<HANDLE> handles;
        handles.push_back(m_startProcessing.Get());
        handles.push_back(m_shutdown.Get());
        unsigned int signalledIndex = Sync::AutoResetEvent::WaitForAny(handles);
        if (signalledIndex == 1) {
            // Shutdown
            break;
        }
        else {
            // Start processing
            while (true) {
                SteamAPI_RunCallbacks();
                if (GetOutstandingCallCount() <= 0) {
                    break;
                }
                Sleep(SteamCallManager::pollingPeriodMS);
            }
        }
    }
}

SteamLeaderboard_t SteamCallManager::GetLeaderboard(const char* name) {
    return m_getLeaderboard.Call(name);
}

bool SteamCallManager::SetLeaderboardEntry(SteamLeaderboard_t nativeHandle, int score, int* scoreDetails, int scoreDetailsCount) {
    return m_setLeaderboardEntry.Call(nativeHandle, score, scoreDetails, scoreDetailsCount);
}
