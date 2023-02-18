import { puzzleFlatArray } from "../../shared/puzzles";
import { readSolutionDatabaseAsync, SolutionDatabaseEntry } from "./shared";

const [_node, _script, puzzleTitle, countString] = process.argv;
const count = countString ? parseInt(countString) : 10;

(async () => {
    const db = await readSolutionDatabaseAsync();
    for (const { title } of puzzleFlatArray.filter(p => (!puzzleTitle || p.title === puzzleTitle))) {
        console.log(`=== ${title} ===`);

        const entries: SolutionDatabaseEntry[] = [];
        for (const [userId, foci] of Object.entries(db[title])) {
            for (const [focus, entry] of Object.entries(foci)) {
                entries.push(entry);
            }
        }

        const sorted = entries.sort((b, a) => (new Date(a.time).valueOf() - new Date(b.time).valueOf())).slice(0, count);
        for (const entry of sorted) {
            console.log(`\t${entry.time}`);
        }
    }
})();
