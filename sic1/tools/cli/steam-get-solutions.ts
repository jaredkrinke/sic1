// This is a command line tool for downloading solutions from Steam
//
// USAGE: ts-node script.ts [puzzle title] [focus]

import { getLeaderboardEntriesAsync, getLeaderboardsForGameAsync } from "./steam-api";
import { getApiKeyAsync, getAppIdAsync, Solution } from "./shared";
import { puzzleFlatArray } from "../../shared/puzzles";

(async () => {
    const key = await getApiKeyAsync();
    const [ _exePath, _scriptPath, puzzleTitleRaw ] = process.argv;
    const appId = await getAppIdAsync();
    const foci = ["cycles", "bytes"] as const;
    const puzzleTitles = puzzleTitleRaw ? [puzzleTitleRaw] : puzzleFlatArray.map(p => p.title);

    const leaderboardNameToId: { [name: string]: number } = {};
    for (const { name, id } of await getLeaderboardsForGameAsync(key, appId)) {
        leaderboardNameToId[name] = id;
    }

    const solutions: Solution[] = [];
    for (const puzzleTitle of puzzleTitles) {
        for (const focus of foci) {
            for (const { steamID, score, detailData } of await getLeaderboardEntriesAsync(key, appId, leaderboardNameToId[`${puzzleTitle}_${focus}`])) {
                solutions.push({
                    puzzleTitle,
                    userId: `steam:${steamID}`,
                    cycles: (focus === "cycles") ? score : null,
                    bytes: (focus === "bytes") ? score : null,
                    program: detailData,

                    source: "steam",
                    focus,
                });
            }
        }
    }

    console.log(JSON.stringify(solutions));
})();
