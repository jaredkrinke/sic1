#pragma once

// This is a flat, blocking API for a tiny subset of the Steamworks client SDK

// All functions return non-zero on success and zero on failure
#define C_STEAM_API extern "C" __declspec(dllimport) int

// Startup and shutdown
C_STEAM_API c_steam_start(unsigned int app_id, int* should_restart);
C_STEAM_API c_steam_stop();

// Use this to free allocated strings returned from the below functions
C_STEAM_API c_steam_free_string(char* data);

// User info
C_STEAM_API c_steam_user_name_get(char** user_name);

// Leaderboards
C_STEAM_API c_steam_leaderboard_get(const char* leaderboard_name, void** leaderboard);
C_STEAM_API c_steam_leaderboard_free(void* leaderboard);
C_STEAM_API c_steam_leaderboard_set_score(void* leaderboard, int score, const unsigned char* detail, size_t detail_bytes);
C_STEAM_API c_steam_leaderboard_get_friend_scores(void* leaderboard, char** friend_scores_json);

// Achievements
C_STEAM_API c_steam_achievement_get(const char* achievement_id, int* achieved);
C_STEAM_API c_steam_achievement_set(const char* achievement_id, int* newly_achieved);
C_STEAM_API c_steam_achivements_store();
