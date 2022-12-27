// This is for writing all leaderboards to JSON, for bundling with the app (or as a fallback for the web release)

import { Sic1WebService } from "../../client/ts/service";
import { puzzleFlatArray } from "../../shared/puzzles";
import * as Contract from "../../server/contract/contract";

// TODO: Consolidate
type Sic1PuzzleStats = { [puzzleTitle: string]: Contract.PuzzleStatsResponse };

interface Sic1StatsCache {
    userStats: Contract.UserStatsResponse;
    puzzleStats: Sic1PuzzleStats;
}

(async () => {
    const service = new Sic1WebService();
    const puzzleStats: Sic1PuzzleStats = {};
    for (const { title } of puzzleFlatArray) {
        puzzleStats[title] = await service.getPuzzleStatsRawAsync(title);
    }
    
    const cache: Sic1StatsCache = {
        userStats: await service.getUserStatsRawAsync(),
        puzzleStats,
    };
    
    console.log(JSON.stringify(cache));
})();
