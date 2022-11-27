const int32Max = 2147483647;

interface Leaderboard {
    id: number;
    name: string;
    entries: number;
    sortmethod: "Ascending" | "Descending";
}

interface LeaderboardEntry {
    steamID: string;
    score: number;
    rank: number;
    ugcid: string;
    detailData: string;
}

const leaderboardDataRequestNames = {
    global: 0,
    aroundUser: 1,
    friends: 2,
} as const;

type LeaderboardDataRequest = keyof typeof leaderboardDataRequestNames;

const getLeaderboardsForGame = "https://partner.steam-api.com/ISteamLeaderboards/GetLeaderboardsForGame/v2/";
const getLeaderboardEntries = "https://partner.steam-api.com/ISteamLeaderboards/GetLeaderboardEntries/v1/";

async function getAsync(uri: string, params: Record<string, string>) {
    const query = `${uri}?${new URLSearchParams(params)}`;
    console.log(`GET ${query}`);

    const result = await fetch(query, { method: "GET" });
    if (!result.ok) {
        throw new Error(`${result.statusText}: ${await result.text()}`);
    }

    return await result.json();
}

async function getLeaderboardsForGameAsync(key: string, appId: string): Promise<Leaderboard[]> {
    return (await getAsync(getLeaderboardsForGame, { key, appid: appId })).response.leaderboards;
}

async function getLeaderboardEntriesAsync(key: string, appId: string, leaderboardId: number, dataRequest: LeaderboardDataRequest = "global", rangeStart = 0, rangeEnd =  int32Max): Promise<LeaderboardEntry> {
    return (await getAsync(getLeaderboardEntries, {
        key,
        appid: appId,
        leaderboardid: leaderboardId.toString(),
        datarequest: leaderboardDataRequestNames[dataRequest].toString(),
        rangestart: rangeStart.toString(),
        rangeend: rangeEnd.toString(),
    })).leaderboardEntryInformation.leaderboardEntries;
}

const [ key, leaderboardId ] = Deno.args;
const appId = await Deno.readTextFile("../../client/windows/steam_appid.txt");

// console.log(await getLeaderboardsForGameAsync(key, appId));
console.log(await getLeaderboardEntriesAsync(key, appId, parseInt(leaderboardId)));

// TODO: Try to use Node again, just to keep things consistent...
// TODO: For userStats and each puzzle, download all leaderboard entries, validate them, bucket, and produce a new stats cache. The two caches can be merged either at build time or run time.
