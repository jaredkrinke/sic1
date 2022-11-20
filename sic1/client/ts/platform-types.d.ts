// Host objects for WebView2-based app
declare const chrome: { webview: { hostObjects: {
    sync: {
        steam: {
            UserName: string,

            // Leaderboards
            ResolveGetLeaderboard: (resolve: (leaderboardHandle: number) => void, reject: (status: number) => void, leaderboardName: string) => void;
            ResolveSetLeaderboardEntry: (resolve: (updated: boolean) => void, reject: (status: number) => void, leaderboardHandle: number, score: number, program?: number[]) => void;
            ResolveGetFriendLeaderboardEntries: (resolve: (flatArray: (string | number)[]) => void, reject: (status: number) => void, leaderboardHandle: number) => void;

            // Achievements
            GetAchievement: (achievementId: string) => boolean;
            SetAchievement: (achievementId: string) => boolean;
            ResolveStoreAchievements: (resolve: () => void, reject: (status: number) => void) => void;
        },
        webViewWindow: {
            Fullscreen: boolean,
            LocalStorageDataString?: string, // Used for both import and export
            OnClosing: () => void,

            // Presentation settings
            GetPresentationSetting: (fieldName: string) => number;
            SetPresentationSetting: (fieldName: string, value: number) => void;

            // Data/settings persistence
            ResolvePersistLocalStorage: (resolve: () => void, reject: (status: number) => void, data: string) => void;
            ResolvePersistPresentationSettings: (resolve: () => void, reject: (status: number) => void) => void;
        },
    },
    options: {
        forceAsyncMethodMatches: RegExp[],
    },
} } };
