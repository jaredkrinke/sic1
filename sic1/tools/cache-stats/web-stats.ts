// This is for writing all leaderboards to JSON, for bundling with the app (or as a fallback for the web release)

import { Sic1WebService } from "../../client/ts/service";
import { puzzleFlatArray } from "../../shared/puzzles";
import type { Sic1PuzzleStats, Sic1StatsCache } from "../../client/ts/stats-cache";

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
