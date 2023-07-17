import * as backtrace from "backtrace-js";

export type PlatformName = "steam" | "web";
export type RuntimeName = "browser" | "electron" | "webview2";

// Check for debug mode:
//
// 1. If "debug" query parameter is specified, obey that (e.g. ?debug=1)
// 2. Otherwise, enable debug mode if either:
//   a. Hostname is "localhost"
//   b. Or running in app mode and a debugger is attached

const url = new URL(window.location.href);
const debugSearchParameter = url.searchParams.get("debug");
export const debug = (debugSearchParameter === null)
    ? ((url.hostname === "localhost") || ((window as any).chrome?.webview?.hostObjects?.sync?.webViewWindow?.IsDebuggerPresent))
    : (debugSearchParameter === "1");

export const suppressUpload = (url.searchParams.get("upload") === "0");

// Determine platform (if chrome.webview.hostObjects.sync.steam exists, assume "steam"; otherwise "web")
const steamHostObject = ((window as any).chrome?.webview?.hostObjects?.sync?.steam);
export const platform: PlatformName = steamHostObject ? "steam" : "web";
export const runtime: RuntimeName = steamHostObject ? (steamHostObject.Runtime ?? "webview2") : "browser";

if (debug) {
    // Pop up a dialog in debug mode for unhandled errors. Unhandled promise rejections are logged to the debug console.
    window.onerror = (msg: string | Event, url, lineNumber, columnNumber, error) => alert(JSON.stringify({ msg, url, lineNumber, columnNumber, error }, undefined, 4));
} else {
    // Use Backtrace.io for error reporting when *not* in debug mode
    const runtimeToToken = {
        browser: "3d0813b41068cb04f05b582a7e19ddc821bd3e583cc625f80f6046ab4e5f42ed",
        electron: "a997d4dc205879a2ab25fe2ccdc542e14fbe3fa455426dde57890a7549c3a075",
        webview2: "de4bca94436fd7879be4a36d9a689358f274387341b06722b838c5f10f921790",
    };

    // For app mode, exit the app if an error occurs (after reporting the error via Backtrace)
    const closeOnUnhandledError = (platform === "steam");
    if (closeOnUnhandledError) {
        window.onerror = (msg: string | Event, url, lineNumber, columnNumber, error) => {
            // Run Backtrace.io onerror handler (copied here) and then close the app
            if (!error) {
                if (typeof(msg) === "string") {
                    error = new Error(msg);
                } else {
                    error = new Error((msg as ErrorEvent).error);
                }
            }

            // Note: backtrace.reportSync doesn't wait for the report to be sent!
            backtrace.report(error, {
                "exception.lineNumber": lineNumber,
                "exception.columnNumber": columnNumber,
            }).then(() => window.close());
        };
    }

    try {
        backtrace.initialize({
            endpoint: `https://submit.backtrace.io/apg/${runtimeToToken[runtime]}/json`,
            disableGlobalHandler: closeOnUnhandledError,
            handlePromises: true,
        });
    } catch {
        // I think this fails the first time a new submission token is used, so ignoring any exceptions here...
    }
}
