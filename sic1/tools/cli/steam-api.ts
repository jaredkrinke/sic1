const int32Max = 2147483647;

export interface Leaderboard {
    id: number;
    name: string;
    entries: number;
    sortmethod: "Ascending" | "Descending";
}

export interface LeaderboardEntry {
    steamID: string;
    score: number;
    rank: number;
    ugcid: string;
    detailData: string;
}

export const leaderboardDataRequestNames = {
    global: 0,
    aroundUser: 1,
    friends: 2,
} as const;

export type LeaderboardDataRequest = keyof typeof leaderboardDataRequestNames;

export const getLeaderboardsForGame = "https://partner.steam-api.com/ISteamLeaderboards/GetLeaderboardsForGame/v2/";
export const getLeaderboardEntries = "https://partner.steam-api.com/ISteamLeaderboards/GetLeaderboardEntries/v1/";

async function getAsync(uri: string, params: Record<string, string>) {
    const query = `${uri}?${new URLSearchParams(params)}`;
    console.error(`GET ${query}`);

    const result = await fetch(query, { method: "GET" });
    if (!result.ok) {
        throw new Error(`${result.statusText}: ${await result.text()}`);
    }

    return await result.json();
}

export async function getLeaderboardsForGameAsync(key: string, appId: string): Promise<Leaderboard[]> {
    return (await getAsync(getLeaderboardsForGame, { key, appid: appId })).response.leaderboards;
}

export async function getLeaderboardEntriesAsync(key: string, appId: string, leaderboardId: number, dataRequest: LeaderboardDataRequest = "global", rangeStart = 0, rangeEnd =  int32Max): Promise<LeaderboardEntry[]> {
    return (await getAsync(getLeaderboardEntries, {
        key,
        appid: appId,
        leaderboardid: leaderboardId.toString(),
        datarequest: leaderboardDataRequestNames[dataRequest].toString(),
        rangestart: rangeStart.toString(),
        rangeend: rangeEnd.toString(),
    })).leaderboardEntryInformation.leaderboardEntries;
}
