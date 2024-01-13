import { Achievement } from "./achievements";
import { wrapNativePromise } from "./native-promise-wrapper";
import { Sic1Service, Sic1SteamService, Sic1WebService } from "./service";
import { platform, PlatformName } from "./setup";
import { Shared } from "./shared";
import { SteamApi } from "./steam-api";

const manualUrl = (new URL('../content/html/sic1-manual.html', import.meta.url)).href;

interface FullscreenManager {
    get: () => boolean;
    set(fullscreen: boolean): void;
}

export interface PresentationData {
    fullscreen: boolean;
    zoom: number;

    soundEffects: boolean;
    soundVolume: number;
    
    music: boolean;
    musicVolume: number;
}

class CoalescedFunction {
    private scheduled = false;
    private resolves: (() => void)[] = [];
    private rejects: ((reason?: any) => void)[] = [];

    constructor(private readonly f: () => void | undefined, private readonly delay: number) {
    }

    public runAsync(): Promise<void> {
        if (this.f && !this.scheduled) {
            this.scheduled = true;
            setTimeout(() => {
                this.scheduled = false;
                try {
                    this.f();
                    for (const resolve of this.resolves) {
                        resolve();
                    }
                } catch (e) {
                    for (const reject of this.rejects) {
                        reject(e);
                    }
                } finally {
                    this.resolves.length = 0;
                    this.rejects.length = 0;
                }
            }, this.delay);
        }

        return new Promise<void>((resolve, reject) => {
            this.resolves.push(resolve);
            this.rejects.push(reject);
        });
    }
}

export interface Platform {
    /** Indicates the program should have native app semantics, e.g. it should have an "exit" option in the menu. */
    readonly app: boolean;

    /** Opens the SIC-1 manual in a new tab/window. */
    readonly openManual: () => void;

    /** Indicates that there should *not* be an option to upload the user's name to leaderboards (via web service).  */
    readonly disableUserNameUpload?: boolean;

    /** True if platform should support manual export/import of save data. */
    readonly allowImportExport?: boolean;

    /** Used for querying and setting full-screen mode. */
    readonly fullscreen: FullscreenManager;

    /** User profile and/or statistics service implementation. */
    readonly service: Sic1Service;

    /** Overrides the user name, if provided. */
    readonly userNameOverride?: string;

    /** Overrides saved full-screen value on load, if provided. */
    readonly fullscreenDefault?: boolean;

    /** Persist localStorage data (only necessary in app mode) */
    readonly scheduleLocalStoragePersist?: () => void;

    /** Persist presentation settings (only necessary in app mode) */
    readonly schedulePresentationSettingsPersist?: () => void;

    /** Presentation settings storage override. */
    presentationSettings?: PresentationData;

    /** Write a callback to this property to have it called in app mode when the window is being closed (e.g. to save progress). */
    onClosing?: () => void;

    /** Get "achieved" status of an achievement. */
    readonly getAchievementAsync: (id: string ) => Promise<boolean>;

    /** Used for setting achievements. */
    readonly setAchievementAsync: (id: Achievement) => Promise<boolean>;

    /** Used for suppressing achievement notification when windowed for Steam (because Steam UI pops up a notification on the desktop). */
    readonly shouldShowAchievementNotification?: () => boolean;
}

const createPlatform: Record<PlatformName, () => Platform> = {
    steam: () => {
        const { steam, webViewWindow } = chrome.webview.hostObjects.sync;
        const userName = steam.UserName;

        // Helpers for saving and restoring localStorage (used for Steam Cloud integration)
        const forEachRelevantLocalStorageKey = (callback: (key: string) => void) => {
            const count = localStorage.length;
            for (let i = 0; i < count; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(Shared.localStoragePrefix)) {
                    callback(key);
                }
            }
        };

        const localStorageManager = {
            extract: (): string => {
                // Read all relevant keys into a big record, and then stringify it
                const data: Record<string, string> = {};
                forEachRelevantLocalStorageKey((key) => {
                    data[key] = localStorage[key];
                });
                return JSON.stringify(data);
            },
            inject: (dataString: string, clear?: boolean) => {
                // Clear all relevant keys and then populate from saved data
                try {
                    if (dataString) {
                        // Try to parse JSON before erasing localStorage, in case the JSON is invalid/corrupt
                        const data = JSON.parse(dataString) as Record<string, string>;

                        const keysToRemove: string[] = [];
                        forEachRelevantLocalStorageKey((key) => keysToRemove.push(key));
                        for (const key of keysToRemove) {
                            localStorage.removeItem(key);
                        }
        
                        for (const [key, value] of Object.entries(data)) {
                            localStorage[key] = value;
                        }
                    }
                } catch {}
            },
        };

        // On startup, import previously-saved localStorage data
        localStorageManager.inject(webViewWindow.LocalStorageDataString!);
        webViewWindow.LocalStorageDataString = undefined;

        // Presentation settings proxy
        const presentationSettings = new Proxy({}, {
            get: (target, property) => {
                switch (property) {
                    case "fullscreen": return !!(webViewWindow.GetPresentationSetting("fullscreen"));
                    case "zoom": return webViewWindow.GetPresentationSetting("zoom");
                    case "soundEffects": return !!(webViewWindow.GetPresentationSetting("soundEffects"));
                    case "soundVolume": return webViewWindow.GetPresentationSetting("soundVolume");
                    case "music": return !!(webViewWindow.GetPresentationSetting("music"));
                    case "musicVolume": return webViewWindow.GetPresentationSetting("musicVolume");
                    default: throw `Invalid property: ${String(property)}`;
                }
            },
            set: (target, property, value) => {
                switch (property) {
                    case "fullscreen": webViewWindow.SetPresentationSetting("fullscreen", value ? 1 : 0); return true;
                    case "zoom": webViewWindow.SetPresentationSetting("zoom", value); return true;
                    case "soundEffects": webViewWindow.SetPresentationSetting("soundEffects", value ? 1 : 0); return true;
                    case "soundVolume": webViewWindow.SetPresentationSetting("soundVolume", value); return true;
                    case "music": webViewWindow.SetPresentationSetting("music", value ? 1 : 0); return true;
                    case "musicVolume": webViewWindow.SetPresentationSetting("musicVolume", value); return true;
                    default: throw `Invalid property: ${String(property)}`;
                }
            },
        }) as PresentationData;

        const steamApiKey = `${Shared.localStoragePrefix}steamApi`;
        const persistDelayMS = 100;
        const persistPresentationSettings = new CoalescedFunction(() => wrapNativePromise(webViewWindow.ResolvePersistPresentationSettings), persistDelayMS);

        let steamApi: SteamApi;
        const saveSteamApi = () => {
            if (steamApi) {
                localStorage.setItem(steamApiKey, steamApi.serialize());
            }
        };

        const persistLocalStorage = new CoalescedFunction(() => {
            saveSteamApi();
            wrapNativePromise(webViewWindow.ResolvePersistLocalStorage, localStorageManager.extract());
        }, persistDelayMS);

        const persistAchievementsDelayMS = 250;
        const persistAchievements = new CoalescedFunction(() => wrapNativePromise(steam.ResolveStoreAchievements), persistAchievementsDelayMS);

        steamApi = new SteamApi(() => persistLocalStorage.runAsync(), localStorage.getItem(steamApiKey));

        const platform: Platform = {
            app: true,
            openManual: () => webViewWindow.OpenManual(),
            disableUserNameUpload: true,
            service: new Sic1SteamService(steamApi),
            fullscreen: {
                get: () => webViewWindow.Fullscreen,
                set: (fullscreen) => { webViewWindow.Fullscreen = fullscreen; },
            },
            presentationSettings,
            userNameOverride: (userName && userName.length > 0) ? userName : undefined,
            scheduleLocalStoragePersist: () => persistLocalStorage.runAsync(),
            schedulePresentationSettingsPersist: () => persistPresentationSettings.runAsync(),
            getAchievementAsync: async (id: Achievement) => { return steam.GetAchievement(id); },
            setAchievementAsync: async (id: Achievement) => {
                const updated = steam.SetAchievement(id);
                if (updated) {
                    await persistAchievements.runAsync();
                    return true;
                }
                return false;
            },
            shouldShowAchievementNotification: () => webViewWindow.Fullscreen, // Only show when in full-screen
        };

        // On exit, provide updated localStorage data for export
        webViewWindow.OnClosing = () => {
            // Save current puzzle data, if needed
            // Note: any scheduled persist will be ignored by the native code
            if (platform.onClosing) {
                platform.onClosing();
            }

            // Save localStorage; it will be persisted via native code during shutdown 
            saveSteamApi();
            webViewWindow.LocalStorageDataString = localStorageManager.extract();
        };

        return platform;
    },
    web: () => {
        const achievementsKey = `${Shared.localStoragePrefix}achievements`;
        function loadAchievements(): { [id: string]: boolean } {
            let achievements: { [id: string]: boolean };
            try {
                const achievementsJson = localStorage.getItem(achievementsKey);
                if (achievementsJson) {
                    achievements = JSON.parse(achievementsJson);
                }
            } catch {
                // Just re-create on error
            }

            return (typeof(achievements) === "object") ? achievements : {};
        }

        return {
            app: false,
            allowImportExport: true,
            openManual: () => window.open(manualUrl, "_blank"),
            service: new Sic1WebService(),
            fullscreen: {
                get: () => !!document.fullscreenElement,
                set: (fullscreen) => {
                    if (fullscreen && !document.fullscreenElement) {
                        document.documentElement.requestFullscreen();
                    } else if (!fullscreen && document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                },
            },
            shouldShowAchievementNotification: () => true,
            getAchievementAsync: (id: string) => {
                return Promise.resolve(!!loadAchievements()[id]);
            },
            setAchievementAsync: (id) => {
                const achievements = loadAchievements();
                let newlyAchieved = false;
                if (!achievements[id]) {
                    achievements[id] = true;
                    newlyAchieved = true;
                    
                    try {
                        localStorage.setItem(achievementsKey, JSON.stringify(achievements))
                    } catch (e) {
                        // Just ignore all errors writing to localStorage, in case it's disabled...
                    }
                }

                return Promise.resolve(newlyAchieved);
            },
        };
    },
};

export const Platform: Platform = createPlatform[platform]();
