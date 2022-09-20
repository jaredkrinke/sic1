import { Sic1Service, Sic1SteamService, Sic1WebService } from "./service";
import { Shared } from "./shared";

type PlatformName = "steam" | "web";

interface FullscreenManager {
    get: () => boolean;
    set(fullscreen: boolean): void;
}

interface Platform {
    /** Indicates the program should have native app semantics, e.g. it should have an "exit" option in the menu. */
    readonly app: boolean;

    /** Indicates that there should *not* be an option to upload the user's name to leaderboards (via web service).  */
    readonly disableUserNameUpload?: boolean;

    /** Used for querying and setting fullscreen mode. */
    readonly fullscreen: FullscreenManager;

    /** User profile and/or statistics service implementation. */
    readonly service: Sic1Service;

    /** Overrides the user name, if provided. */
    readonly userNameOverride?: string;

    /** Write a callback to this property to have it called in app mode when the window is being closed (e.g. to save progress). */
    onClosing?: () => void;
}

declare const chrome: { webview: { hostObjects: {
    sync: {
        steam: {
            UserName: string,
        },
        webViewWindow: {
            Fullscreen: boolean,
            LocalStorageDataString: string, // Used for both import and export
            OnClosing: () => void,
        },
    },
    options: {
        forceAsyncMethodMatches: RegExp[],
    },
} } };

const createPlatform: Record<PlatformName, () => Platform> = {
    steam: () => {
        // Force hostObject.*Async() to be run asynchronously (and return a promise)
        chrome.webview.hostObjects.options.forceAsyncMethodMatches = [/Async$/];

        const { steam, webViewWindow } = chrome.webview.hostObjects.sync;
        const userName = steam.UserName;

        // Helpers for saving and restoring localStorage (used for Steam Cloud integration)
        const forEachRelevantLocalStorageKey = (callback: (key: string) => void) => {
            const count = localStorage.length;
            for (let i = 0; i < count; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(Shared.localStoragePrefix)) {
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
                        const keysToRemove: string[] = [];
                        forEachRelevantLocalStorageKey((key) => keysToRemove.push(key));
                        for (const key of keysToRemove) {
                            localStorage.removeItem(key);
                        }
        
                        const data = JSON.parse(dataString) as Record<string, string>;
                        for (const [key, value] of Object.entries(data)) {
                            localStorage[key] = value;
                        }
                    }
                } catch {}
            },
        };

        // On startup, import previously-saved localStorage data
        localStorageManager.inject(webViewWindow.LocalStorageDataString);
        webViewWindow.LocalStorageDataString = null;

        const platform: Platform = {
            app: true,
            disableUserNameUpload: true,
            service: new Sic1SteamService(),
            fullscreen: {
                get: () => webViewWindow.Fullscreen,
                set: (fullscreen) => { webViewWindow.Fullscreen = fullscreen; },
            },
            userNameOverride: (userName && userName.length > 0) ? userName : undefined,
        };

        // On exit, provide updated localStorage data for export
        webViewWindow.OnClosing = () => {
            // Save current puzzle data, if needed
            if (platform.onClosing) {
                platform.onClosing();
            }

            // Write localStorage to disk
            webViewWindow.LocalStorageDataString = localStorageManager.extract();
        };

        return platform;
    },
    web: () => ({
        app: false,
        service: new Sic1WebService(),
        fullscreen: {
            get: () => !!document.fullscreenElement,
            set: (fullscreen) => {
                if (fullscreen && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            },
        },
    }),
};

// Determine platform (if chrome.webview.hostObjects.sync.steam exists, assume "steam"; otherwise "web")
const platform: PlatformName = (chrome?.webview?.hostObjects?.sync?.steam) ? "steam" : "web";

export const Platform: Platform = createPlatform[platform]();
