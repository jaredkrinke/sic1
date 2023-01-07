// This is a command line tool for downloading solutions from Steam
//
// USAGE: ts-node script.ts <API key> [puzzle title] [focus]

import { getLeaderboardEntriesAsync, getLeaderboardsForGameAsync } from "./steam-api";
import { getAppIdAsync, Solution, unhexifyBytes } from "./shared";
import { puzzleFlatArray } from "../../shared/puzzles";

(async () => {
    const [ _exePath, _scriptPath, key, puzzleTitleRaw, focusRaw ] = process.argv;
    const appId = await getAppIdAsync();
    const foci = focusRaw ? [focusRaw] : ["cycles", "bytes"];
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
                    program: unhexifyBytes(detailData),
                });
            }
        }
    }

    console.log(JSON.stringify(solutions));
})();
