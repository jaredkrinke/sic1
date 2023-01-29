import { puzzleFlatArray } from "../../shared/puzzles";
import { isSolutionValid, readSolutionDatabaseAsync } from "./shared";
import * as Contract from "../../server/contract/contract";
import type { Sic1PuzzleStats, Sic1StatsCache } from "../../client/ts/stats-cache";

const iterations = 200;

const focusMapping = [
    ["cyclesExecutedBySolution", "cycles"],
    ["memoryBytesAccessedBySolution", "bytes"],
] as const;

(async () => {
    const db = await readSolutionDatabaseAsync();
    const result: { [source: string]: Sic1StatsCache } = {};

    for (const source of ["steam", "web"]) {
        const puzzleStats: Sic1PuzzleStats = {};
        const userToSolved: { [userId: string]: Set<string> } = {};
    
        // Puzzle stats
        for (const [responseKey, focus] of focusMapping) {
            for (const puzzle of puzzleFlatArray) {
                const scoreToCount: { [score: number]: number } = {};
                const puzzleData = db[puzzle.title];
                const solutions = Object.entries(puzzleData)
                    .filter(([userId, foci]) => !!foci[focus])
                    .map(([userId, foci]) => ({ ...(foci[focus]), userId }))
                    .filter(s => (s.source === source))
                ;
                
                // Verify solutions and create histogram
                for (const solution of solutions) {
                    let i: number;
                    for (i = 0; i < iterations; i++) {
                        if (!isSolutionValid(puzzle, solution)) {
                            break;
                        }
                    }

                    const score = solution[focus];
                    if ((i === iterations) && score) {
                        // Solution never failed; it is valid
                        scoreToCount[score] = (scoreToCount[score] ?? 0) + 1;

                        // Note that the user solved this puzzle
                        const { userId } = solution;
                        if (!userToSolved[userId]) {
                            userToSolved[userId] = new Set();
                        }

                        userToSolved[userId].add(puzzle.title);
                    }
                }

                if (!puzzleStats[puzzle.title]) {
                    puzzleStats[puzzle.title] = {} as Contract.PuzzleStatsResponse;
                }

                puzzleStats[puzzle.title][responseKey] = Object.entries(scoreToCount)
                    .map(([scoreString, count]) => ({
                        bucketMax: parseInt(scoreString),
                        count,
                    }));
            }
        }

        // User stats
        const solvedCountToCount: { [solvedCount: number]: number } = {};
        for (const [userId, solved] of Object.entries(userToSolved)) {
            const solvedCount = solved.size;
            solvedCountToCount[solvedCount] = (solvedCountToCount[solvedCount] ?? 0) + 1;
        }

        const userHistogram: Contract.HistogramData = Object.entries(solvedCountToCount).map(([solvedCount, count]) => ({
            bucketMax: parseInt(solvedCount),
            count,
        }));

        result[source] = {
            userStats: {
                solutionsByUser: userHistogram,
                userSolvedCount: 0,
            },
            puzzleStats,
        };

        console.log(`\nconst ${source}StatsCache: Sic1StatsCache = ${JSON.stringify(result[source])};`);
    }
})();
