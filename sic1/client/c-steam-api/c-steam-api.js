const koffi = require("koffi");

/** Represents an error that occurred when interacting with c-steam-api.dll. */
class SteamError extends Error {
    constructor(functionName) {
        super(`Unexpected error from Steam API: ${functionName}!`);
    }
}

// Koffi-based FFI to c-steam-api.dll
const lib = koffi.load("c-steam-api");

const c_steam_string = koffi.disposable(
    "c_steam_string",
    "string",
    lib.func("int c_steam_string_free(void*)"),
);

const steamRaw = {
    start: lib.func("int c_steam_start(unsigned int app_id, _Out_ int* should_restart)"),
    stop: lib.func("int c_steam_stop()"),
    getUserName: lib.func("int c_steam_user_name_get(_Out_ c_steam_string* user_name)"),
    getLeaderboard: lib.func("int c_steam_leaderboard_get(string leaderboard_name, _Out_ unsigned long long* leaderboard)"),
    setLeaderboardScore: lib.func("int c_steam_leaderboard_set_score(unsigned long long leaderboard, int score, int* detail, int detail_count, _Out_ int* out_score_changed)"),
    getFriendLeaderboardScores: lib.func("int c_steam_leaderboard_get_friend_scores(unsigned long long leaderboard, _Out_ c_steam_string* out_friend_scores_json)"),
    getAchievement: lib.func("int c_steam_achievement_get(string achievement_id, _Out_ int* out_achieved)"),
    setAchievement: lib.func("int c_steam_achievement_set(string achievement_id, _Out_ int* out_newly_achieved)"),
    storeAchievements: lib.func("int c_steam_achivements_store()"),
};

// Helper for checking status codes
const check = (status, functionName) => {
    if (!status) {
        throw new SteamError(functionName);
    }
}

/** Wrapper for a Steam leaderboard. */
class SteamLeaderboard {
    constructor(handle) {
        this.handle = handle;
    }

    /** Sets this player's score on the leaderboard.
     * @param {number} score
     * @param {number[]} detailBytes
     * @returns {boolean} True if the score was updated/improved.
    */
    setScore(score, detailBytes) {
        let detailInts = null;
        if (detailBytes) {
            // Pack bytes into 32-bit integers
            if (detailBytes.length > 256) {
                throw new SteamError(`Attempted to set leaderboard details that are longer than 256 bytes (length: ${detailBytes.length})!`);
            }

            let position = 0;
            let int = 0;
            detailInts = [];
            for (let i = 0; i < detailBytes.length; i++) {
                const byte = detailBytes[i];
                if (byte < 0 || byte >= 256) {
                    throw new SteamError(`Attempted to set leaderboard detail with invalid byte: ${byte}!`);
                }

                int |= (byte << (position++ * 8));

                if (position === 4 || i === (detailBytes.length - 1)) {
                    detailInts.push(int);
                    position = 0;
                    int = 0;
                }
            }
        }

        const out = [0];
        check(steamRaw.setLeaderboardScore(this.handle, score, detailInts, detailInts?.length ?? 0, out), "setLeaderboardScore");
        return !!out[0];
    }

    /** Gets this player's friends' scores.
     * @returns {{ name: string, score: number }[]} List of friend leaderboard entries.
    */
    getFriendScores() {
        const out = [null];
        check(steamRaw.getFriendLeaderboardScores(this.handle, out), "getFriendLeaderboardScores");
        return JSON.parse(out[0] ?? "[]");
    }
}

/** Synchronous/blocking wrapper around the Steam API. */
const Steam = {
    /** Initializes the Steam API.
     * @param {number} appId - Steam app id.
     * @returns {boolean} True if the app should exit (because it's being restarted by Steam).
    */
    start(appId) {
        const out = [0];
        check(steamRaw.start(appId, out), "start");
        return !!out[0];
    },

    /** Shuts down the Steam API. */
    stop() {
        // Note: Failures are ignored
        steamRaw.stop();
    },

    /** Retrieve's the user's "persona name".
     * @returns {string} User's "persona name" (display name).
    */
    getUserName() {
        const out = [null];
        check(steamRaw.getUserName(out), "getUserName");
        return out[0] ?? "";
    },

    /** Retrieves a SteamLeaderboard object corresponding to the given leaderboard name.
     * @param {string} leaderboardName
     * @returns {SteamLeaderboard}
    */
    getLeaderboard(leaderboardName) {
        const out = [0];
        check(steamRaw.getLeaderboard(leaderboardName, out), "getLeaderboard");
        return new SteamLeaderboard(out[0]);
    },

    /** Retrieves whether or not this player has achieved the given achievement.
     * @param {string} achievementId - String name of the achievement.
     * @returns {boolean} True if the player has achieved the given achievement.
    */
    getAchievement(achievementId) {
        const out = [0];
        check(steamRaw.getAchievement(achievementId, out), "getAchievement");
        return !!out[0];
    },

    /** Marks the achievement as achieved and returns true if newly achieved.
     * @param {string} achievementId - String name of the achievement.
     * @returns {boolean} true if the achievement was newly achieved.
    */
    setAchievement(achievementId) {
        const out = [0];
        check(steamRaw.setAchievement(achievementId, out), "setAchievement");
        return !!out[0];
    },

    /** Persists achievements to Steam's servers. */
    storeAchievements() {
        check(steamRaw.storeAchievements(), "storeAchievements");
    }
};

module.exports.Steam = Steam;
