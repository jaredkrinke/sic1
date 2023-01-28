// Tool for merging solution data into a unified database
//
// Note: This tool does not delete entries.

import { solutionDatabasePath, readSolutionDatabaseAsync, readTextFileAsync, Solution, writeTextFileAsync } from "./shared";

(async () => {
    const db = await readSolutionDatabaseAsync();
    let newPuzzleCount = 0;
    let newSolutionCount = 0;

    for (const source of ["steam", "web"]) {
        const solutions: Solution[] = JSON.parse(await readTextFileAsync(`${source}.json`));
        for (const { puzzleTitle, userId, focus, ...rest } of solutions) {
            if (!db[puzzleTitle]) {
                db[puzzleTitle] = {};
                ++newPuzzleCount;
            }

            if (!db[puzzleTitle][userId]) {
                db[puzzleTitle][userId] = {};
            }

            if (!db[puzzleTitle][userId][focus]) {
                ++newSolutionCount;
            }

            db[puzzleTitle][userId][focus] = { ...rest };
        }
    }

    console.log(`New puzzle count: ${newPuzzleCount}`);
    console.log(`New solution count: ${newSolutionCount}`);

    await writeTextFileAsync(solutionDatabasePath, JSON.stringify(db));
})();
