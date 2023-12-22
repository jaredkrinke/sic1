import { puzzleFlatArray } from "../../shared/puzzles";
import { isSolutionRobustlyValid, readSolutionDatabaseAsync, SolutionDatabaseEntry } from "./shared";

const [_node, _script, puzzleTitle] = process.argv;

(async () => {
    const puzzle = puzzleFlatArray.find(p => p.title === puzzleTitle)!;
    const db = await readSolutionDatabaseAsync();

    const focusToBest = {};
    for (const [userId, foci]  of Object.entries(db[puzzleTitle])) {
        for (const [focus, entry] of Object.entries(foci)) {
            if (isSolutionRobustlyValid(puzzle, entry)) {
                if (!focusToBest[focus] || entry[focus] < focusToBest[focus].entry[focus]) {
                    focusToBest[focus] = {
                        userId,
                        entry,
                    };
                }
            }
        }
    }

    console.log(JSON.stringify(focusToBest, undefined, 4));
})();
