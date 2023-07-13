#include "pch.h"

constexpr int C_STEAM_SUCCESS = 1;
constexpr int C_STEAM_ERROR = 0;

constexpr int C_STEAM_TRUE = 1;
constexpr int C_STEAM_FALSE = 0;

#define C_STEAM_DEF extern "C" __declspec(dllexport) int
#define C_STEAM_TRY noexcept try
#define C_STEAM_CATCH catch (...) { return C_STEAM_ERROR; }
#define C_STEAM_BOOLIFY(a) (a ? C_STEAM_TRUE : C_STEAM_FALSE)

#define CHECK(a) if (!a) throw std::runtime_error("Steam API error!");

SteamCallManager* g_steam_call_manager = nullptr;

// Startup and shutdown
C_STEAM_DEF c_steam_start(unsigned int app_id, int* out_should_restart) C_STEAM_TRY {
	*out_should_restart = C_STEAM_FALSE;

	if (SteamAPI_RestartAppIfNecessary(app_id)) {
		*out_should_restart = C_STEAM_TRUE;
		return C_STEAM_SUCCESS;
	}

	CHECK(SteamAPI_Init());

	g_steam_call_manager = new SteamCallManager();

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

C_STEAM_DEF c_steam_stop() {
	if (g_steam_call_manager) {
		delete g_steam_call_manager;
	}

	SteamAPI_Shutdown();
	return C_STEAM_SUCCESS;
}

// Memory handling
char* duplicate_string(const std::string& str) {
	char* result = _strdup(str.c_str());
	CHECK(result);
	return result;
}

C_STEAM_DEF c_steam_free_string(char* data) {
	if (data) {
		free(data);
	}

	return C_STEAM_SUCCESS;
}

// User info
C_STEAM_DEF c_steam_user_name_get(char** out_user_name) C_STEAM_TRY {
	*out_user_name = nullptr;

	ISteamFriends* friends = SteamFriends();
	CHECK(friends);

	std::string user_name(friends->GetPersonaName());
	*out_user_name = duplicate_string(user_name);

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

// Leaderboards
C_STEAM_DEF c_steam_leaderboard_get(const char* leaderboard_name, unsigned long long* out_leaderboard) C_STEAM_TRY {
	*out_leaderboard = 0;

	CHECK(g_steam_call_manager);
	*out_leaderboard = g_steam_call_manager->GetLeaderboard(leaderboard_name);

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

C_STEAM_DEF c_steam_leaderboard_set_score(unsigned long long leaderboard, int score, const int* detail, int detail_count, int* out_score_updated) C_STEAM_TRY {
	*out_score_updated = C_STEAM_FALSE;

	CHECK(g_steam_call_manager);
	*out_score_updated = C_STEAM_BOOLIFY(g_steam_call_manager->SetLeaderboardEntry(leaderboard, score, detail, detail_count));

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

C_STEAM_DEF c_steam_leaderboard_get_friend_scores(unsigned long long leaderboard, char** friend_scores_json) C_STEAM_TRY {
	*friend_scores_json = nullptr;

	CHECK(g_steam_call_manager);
	std::vector<FriendLeaderboardRow> rows = g_steam_call_manager->GetFriendLeaderboardEntries(leaderboard);

	nlohmann::json json;
	for (const auto& row : rows) {
		json.push_back({
			{ "name", row.name },
			{ "score", row.score },
			});
	}

	*friend_scores_json = duplicate_string(nlohmann::to_string(json).c_str());

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

// Achievements
C_STEAM_DEF c_steam_achievement_get(const char* achievement_id, int* achieved) C_STEAM_TRY {
	*achieved = C_STEAM_FALSE;

	CHECK(g_steam_call_manager);
	*achieved = C_STEAM_BOOLIFY(g_steam_call_manager->GetAchievement(achievement_id));

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

C_STEAM_DEF c_steam_achievement_set(const char* achievement_id, int* newly_achieved) C_STEAM_TRY {
	*newly_achieved = C_STEAM_FALSE;

	CHECK(g_steam_call_manager);
	*newly_achieved = C_STEAM_BOOLIFY(g_steam_call_manager->SetAchievement(achievement_id));

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

C_STEAM_DEF c_steam_achivements_store() C_STEAM_TRY {
	CHECK(g_steam_call_manager);
	g_steam_call_manager->StoreAchievements();

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH
