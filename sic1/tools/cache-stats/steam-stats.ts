// This is a command line tool for caching Steam leaderboard stats, in histogram form:
//
// USAGE: ts-node script.ts <API key> [CSV file]

import { readFile, writeFile } from "fs/promises";
import { puzzleFlatArray } from "../../shared/puzzles";
import * as Contract from "../../server/contract/contract";
import type { Sic1PuzzleStats, Sic1StatsCache } from "../../client/ts/stats-cache";

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

async function getLeaderboardEntriesAsync(key: string, appId: string, leaderboardId: number, dataRequest: LeaderboardDataRequest = "global", rangeStart = 0, rangeEnd =  int32Max): Promise<LeaderboardEntry[]> {
    return (await getAsync(getLeaderboardEntries, {
        key,
        appid: appId,
        leaderboardid: leaderboardId.toString(),
        datarequest: leaderboardDataRequestNames[dataRequest].toString(),
        rangestart: rangeStart.toString(),
        rangeend: rangeEnd.toString(),
    })).leaderboardEntryInformation.leaderboardEntries;
}

function convertLeaderboardEntriesToHistogram(entries: LeaderboardEntry[]): Contract.HistogramData {
    const scoreToCount: { [score: number]: number } = {};
    for (const { score } of entries) {
        const previousValue = scoreToCount[score];
        scoreToCount[score] = previousValue ? (previousValue + 1) : 1;
    }

    return Object.entries(scoreToCount).map(([bucketMax, count]) => ({
        bucketMax: parseInt(bucketMax),
        count,
    }));
}

function convertHistogramDataToCSV(group: string, metric: string, data: Contract.HistogramData): string {
    return data.map(bucket => [group, metric, bucket.bucketMax, bucket.count].join(",")).join("\n") + "\n";
}

const focusMapping = [
    ["cyclesExecutedBySolution", "cycles"],
    ["memoryBytesAccessedBySolution", "bytes"],
];

(async () => {
    const [ _exePath, _scriptPath, key, csvFile ] = process.argv;
    const appId = await readFile("../../client/windows/steam_appid.txt", { encoding: "utf8" });

    const leaderboardNameToId: { [name: string]: number } = {};
    for (const { name, id } of await getLeaderboardsForGameAsync(key, appId)) {
        leaderboardNameToId[name] = id;
    }

    // TODO: Validate Steam leaderboard entries

    // User stats
    const userStats: Contract.UserStatsResponse = {
        solutionsByUser: convertLeaderboardEntriesToHistogram(await getLeaderboardEntriesAsync(key, appId, leaderboardNameToId["Solved Count"])),
        userSolvedCount: 0,
    };

    // Puzzle stats
    const puzzleStats: Sic1PuzzleStats = {};
    for (const { title } of puzzleFlatArray) {
        const response: Partial<Contract.PuzzleStatsResponse> = {};
        for (const [responseKey, focus] of focusMapping) {
            const leaderboardName = `${title}_${focus}`;
            response[responseKey] = convertLeaderboardEntriesToHistogram(await getLeaderboardEntriesAsync(key, appId, leaderboardNameToId[leaderboardName]));
        }
        puzzleStats[title] = response as Contract.PuzzleStatsResponse;
    }

    const statsCache: Sic1StatsCache = {
        userStats,
        puzzleStats,
    };

    console.log(JSON.stringify(statsCache));

    // Output a CSV file, if requested
    if (csvFile) {
        let csv = "Group,Metric,Score,Count\n";
        csv += convertHistogramDataToCSV("Solved Count", "puzzles", userStats.solutionsByUser);
        for (const { title } of puzzleFlatArray) {
            for (const [responseKey, focus] of focusMapping) {
                csv += convertHistogramDataToCSV(title, focus, puzzleStats[title][responseKey]);
            }
        }

        await writeFile(csvFile, csv);
    }
})();
