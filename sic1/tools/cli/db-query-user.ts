import { puzzleFlatArray } from "../../shared/puzzles";
import { readSolutionDatabaseAsync, SolutionDatabaseEntry } from "./shared";

const [_node, _script, userId, puzzleTitle] = process.argv;

(async () => {
    const db = await readSolutionDatabaseAsync();
    const result: { [puzzleTitle: string]: SolutionDatabaseEntry[] } = {};

    for (const { title } of puzzleFlatArray.filter(p => (!puzzleTitle || p.title === puzzleTitle))) {
        const foci = db[title][userId];
        if (foci) {
            result[title] = Object.values(foci);
        }
    }

    console.log(JSON.stringify(result, undefined, 4));
})();
