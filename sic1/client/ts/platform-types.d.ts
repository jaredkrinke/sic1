// Host objects for WebView2-based app
declare const chrome: { webview: { hostObjects: {
    sync: {
        steam: {
            UserName: string,

            // Leaderboards
            GetLeaderboardAsync: (leaderboardName: string) => Promise<number>;
            SetLeaderboardEntryAsync: (leaderboardHandle: number, score: number, program: number[]) => Promise<boolean>;
            GetFriendLeaderboardEntriesAsync: (leaderboardHandle: number) => Promise<(string | number)[]>;
        },
        webViewWindow: {
            Fullscreen: boolean,
            LocalStorageDataString?: string, // Used for both import and export
            OnClosing: () => void,
        },
    },
    options: {
        forceAsyncMethodMatches: RegExp[],
    },
} } };