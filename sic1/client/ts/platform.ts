import { Sic1Service, Sic1SteamService, Sic1WebService } from "./service";

type PlatformName = "steam" | "web";

interface Platform {
    /** Indicates the program should have native app semantics, e.g. it should have an "exit" option in the menu. */
    app: boolean;

    /** Indicates that there should *not* be an option to upload the user's name to leaderboards (via web service).  */
    disableUserNameUpload?: boolean;

    /** User profile and/or statistics service implementation. */
    service: Sic1Service;

    /** Overrides the user name, if provided. */
    userNameOverride?: string;
}

declare const chrome: { webview: { hostObjects: { sync: {
    steam: {
        UserName: string,
    },
} } } };

const createPlatform: Record<PlatformName, () => Platform> = {
    steam: () => {
        const steam = chrome.webview.hostObjects.sync.steam;
        const userName = steam.UserName;

        return {
            app: true,
            disableUserNameUpload: true,
            service: new Sic1SteamService(),
            userNameOverride: (userName && userName.length > 0) ? userName : undefined,
        };
    },
    web: () => ({
        app: false,
        service: new Sic1WebService(),
    }),
};

// Platform is set via globalThis.__platformString, defaulting to "web"
const platform: PlatformName = (() => {
    try {
        const platformString = globalThis.__platformString;
        if (typeof(platformString) === "string" && platformString in createPlatform) {
            return platformString as PlatformName;
        }
    } catch (_e) {}
    return "web";
})();

export const Platform: Platform = createPlatform[platform]();
