import * as backtrace from "backtrace-js";

export type PlatformName = "steam" | "web";

// Check for debug mode
const url = new URL(window.location.href);
const debugSearchParameter = url.searchParams.get("debug");
export const debug = (debugSearchParameter === undefined) ? (url.hostname === "localhost") : (debugSearchParameter !== "0");

// Determine platform (if chrome.webview.hostObjects.sync.steam exists, assume "steam"; otherwise "web")
export const platform: PlatformName = ((window as any).chrome?.webview?.hostObjects?.sync?.steam) ? "steam" : "web";

if (!debug) {
    // Initialize Backtrace.io error reporting
    const platformToToken = {
        steam: "de4bca94436fd7879be4a36d9a689358f274387341b06722b838c5f10f921790",
        web: "3d0813b41068cb04f05b582a7e19ddc821bd3e583cc625f80f6046ab4e5f42ed",
    };

    backtrace.initialize({
        endpoint: `https://submit.backtrace.io/apg/${platformToToken[platform]}/json`,
        handlePromises: true,
    });
}
