// Setup Steam API
const { Steam } = require("c-steam-api");

const appId = 2124440;

// Check if relaunching via Steam
if (Steam.start(appId)) {
    window.close();
} else {
    // Implement the interfaces from host-objects.idl

    // Cache leaderboard objects in an array
    const leaderboards = [];

    const steam = {
        UserName: Steam.getUserName(),

        // Leaderboards
        ResolveGetLeaderboard: async (resolve, reject, leaderboardName) => {
            try {
                const leaderboard = await Steam.getLeaderboardAsync(leaderboardName);
                leaderboards.push(leaderboard);
                resolve(leaderboards.length - 1);
            } catch (error) {
                reject(error);
            }
        },

        ResolveSetLeaderboardEntry: async (resolve, reject, leaderboardHandle, score, program) => {
            try {
                const leaderboard = leaderboards[leaderboardHandle];
                resolve(await leaderboard.setScoreAsync(score, program));
            } catch (error) {
                reject(error);
            }
        },

        ResolveGetFriendLeaderboardEntries: async (resolve, reject, leaderboardHandle) => {
            try {
                const leaderboard = leaderboards[leaderboardHandle];
                const table = await leaderboard.getFriendScoresAsync();

                // Flatten the array in order to follow the existing API
                const flatArray = [];
                for (const { name, score } of table) {
                    flatArray.push(name);
                    flatArray.push(score);
                }
                resolve(flatArray);

            } catch (error) {
                reject(error);
            }
        },

        // Achievements
        GetAchievement: (achievementId) => Steam.getAchievement(achievementId),
        SetAchievement: (achievementId) => Steam.setAchievement(achievementId),

        ResolveStoreAchievements: async (resolve, reject) => {
            try {
                await Steam.storeAchievementsAsync();
                resolve();
            } catch (error) {
                reject(error);
            }
        },
    };

    const webViewWindow = {
        Fullscreen: false, // TODO: How is this used?
        LocalStorageDataString: undefined,
        OnClosing: undefined, // TODO

        // Presentation settings
        GetPresentationSetting: (fieldName) => {
            // TODO
        },

        SetPresentationSetting: (fieldName, value) => {
            // TODO
        },

        // Data/settings persistence
        ResolvePersistLocalStorage: async (resolve, reject, data) => {
            try {
                // TODO
                resolve();
            } catch (error) {
                reject(error);
            }
        },

        ResolvePersistPresentationSettings: async (resolve, reject) => {
            try {
                // TODO
                resolve();
            } catch (error) {
                reject(error);
            }
        },

        // Manual
        OpenManual: () => {
            // TODO
        },
    };

    if (!window.chrome) {
        window.chrome = {};
    }

    window.chrome.webview = {
        hostObjects: {
            sync: {
                steam,
                webViewWindow,
            },
        },
    };

    // Setup exit handler
    // TODO: See if there are any other "close" handlers, and then make sure this one runs last!
    window.addEventListener("close", () => {
        // TODO: Save localStorage to disk
        Steam.stop();
    });
}
