import { puzzleFlatArray } from "../../shared/puzzles";
import { readSolutionDatabaseAsync, SolutionDatabaseEntry } from "./shared";

const [_node, _script, puzzleTitle] = process.argv;

(async () => {
    const db = await readSolutionDatabaseAsync();

    const focusToBest = {};
    for (const [userId, foci]  of Object.entries(db[puzzleTitle])) {
        for (const [focus, entry] of Object.entries(foci)) {
            if (!focusToBest[focus] || entry[focus] < focusToBest[focus].entry[focus]) {
                focusToBest[focus] = {
                    userId,
                    entry,
                };
            }
        }
    }

    console.log(JSON.stringify(focusToBest, undefined, 4));
})();
