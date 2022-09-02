type PlatformName = "steam" | "web";

interface Platform {
    /** Indicates the program should have native app semantics, e.g. it should have an "exit" option in the menu. */
    app: boolean;
}

const platforms: Record<PlatformName, Platform> = {
    steam: {
        app: true,
    },
    web: {
        app: false,
    },
};

// Platform is set via globalThis.__platformString, defaulting to "web"
const platform: PlatformName = (() => {
    try {
        const platformString = globalThis.__platformString;
        if (typeof(platformString) === "string" && platformString in platforms) {
            return platformString as PlatformName;
        }
    } catch (_e) {}
    return "web";
})();

export const Platform = platforms[platform];
