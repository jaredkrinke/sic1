const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const { Steam } = require("c-steam-api");

function ignoreErrors(promise) {
    promise
        .then(() => {})
        .catch(() => {});
}

// Load localStorage data on startup
function getDataPath(tail) {
    return path.join(process.env.LOCALAPPDATA, "SIC-1", tail);
}

const localStorageDataPath = getDataPath("cloud.txt");
let loadedLocalStorageData = "";
try {
    loadedLocalStorageData = fs.readFileSync(localStorageDataPath, { encoding: "utf-8" });
} catch {
    // Assume save file doesn't exist
}

// Check if relaunching via Steam
const appId = 2124440;
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

    // TODO: Load presentation settings
    const presentationSettings = {
        fullscreen: 0, // 0 or 1
        zoom: 1,
        soundEffects: 1, // 0 or 1
        soundVolume: 1,
        music: 1, // 0 or 1
        musicVolume: 1,
    };

    const webViewWindow = new Proxy({
        Fullscreen: undefined, // See proxy handlers

        LocalStorageDataString: loadedLocalStorageData ? loadedLocalStorageData : undefined,
        OnClosing: undefined,

        // Presentation settings
        GetPresentationSetting: (fieldName) => {
            return presentationSettings[fieldName];
        },

        SetPresentationSetting: (fieldName, value) => {
            presentationSettings[fieldName] = value;
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
    }, {
        get(target, property, receiver) {
            switch (property) {
                case "Fullscreen":
                    return ipcRenderer.sendSync("get-fullscreen");

                default:
                    return Reflect.get(target, property, receiver);
            }
        },

        set(target, property, value, receiver) {
            switch (property) {
                case "Fullscreen":
                    ignoreErrors(ipcRenderer.invoke("set-fullscreen", value));
                    return true;

                default:
                    return Reflect.set(target, property, value, receiver);
            }
        },
    });

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
        // Run OnClosing handler first
        if (webViewWindow.OnClosing) {
            // TODO: Ensure this is run even on clicking the window's close button!
            webViewWindow.OnClosing();
        }

        // TODO: Save localStorage to disk
        Steam.stop();
    });
}
