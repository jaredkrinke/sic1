#include "pch.h"

constexpr int C_STEAM_SUCCESS = 1;
constexpr int C_STEAM_ERROR = 0;

#define C_STEAM_DEF extern "C" __declspec(dllexport) int
#define C_STEAM_TRY noexcept try
#define C_STEAM_CATCH catch (...) { return C_STEAM_ERROR; }

#define CHECK(a) if (!a) throw std::runtime_error("Steam API error!");

// Startup and shutdown
C_STEAM_DEF c_steam_start(unsigned int app_id, int* should_restart) C_STEAM_TRY {
	*should_restart = 0;

	if (SteamAPI_RestartAppIfNecessary(app_id)) {
		*should_restart = 1;
		return C_STEAM_SUCCESS;
	}

	CHECK(SteamAPI_Init());

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

C_STEAM_DEF c_steam_stop() {
	SteamAPI_Shutdown();
	return C_STEAM_SUCCESS;
}

// Memory handling
char* duplicate_string(const std::string& str) {
	size_t characters = str.size();
	char* buffer = reinterpret_cast<char*>(malloc(characters + 1));
	CHECK(buffer);
	strncpy(buffer, str.c_str(), characters);
	buffer[characters] = '\0';
	return buffer;
}

C_STEAM_DEF c_steam_free_string(char* data) {
	if (data) {
		free(data);
	}

	return C_STEAM_SUCCESS;
}

// User info
C_STEAM_DEF c_steam_user_name_get(char** user_name) C_STEAM_TRY {
	*user_name = nullptr;

	ISteamFriends* friends = SteamFriends();
	CHECK(friends);

	std::string str(friends->GetPersonaName());
	*user_name = duplicate_string(str);

	return C_STEAM_SUCCESS;
}
C_STEAM_CATCH

// Leaderboards
C_STEAM_DEF c_steam_leaderboard_get(const char* leaderboard_name, void** leaderboard);
C_STEAM_DEF c_steam_leaderboard_free(void* leaderboard);
C_STEAM_DEF c_steam_leaderboard_set_score(void* leaderboard, int score, const unsigned char* detail, size_t detail_bytes);
C_STEAM_DEF c_steam_leaderboard_get_friend_scores(void* leaderboard, char** friend_scores_json);

// Achievements
C_STEAM_DEF c_steam_achievement_get(const char* achievement_id, int* achieved);
C_STEAM_DEF c_steam_achievement_set(const char* achievement_id, int* newly_achieved);
C_STEAM_DEF c_steam_achivements_store();
