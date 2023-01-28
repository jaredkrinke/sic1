// Tool for verifying solutions and writing out statistics and failing users

import { ProgramVerificationError, Puzzle, puzzleFlatArray, solutionBytesMax, verifySolution } from "../../shared/puzzles";
import { readSolutionDatabaseAsync, SolutionDatabaseEntry, unhexifyBytes } from "./shared";

const iterations = 200;

function getPuzzle(title: string): Puzzle {
    return puzzleFlatArray.find(p => p.title === title);
}

let lastLog = 0;
const logPeriod = 1000;
function logIfNeeded(createMessage: () => string): void {
    const now = Date.now();
    if ((now - lastLog) >= logPeriod) {
        lastLog = now;
        console.error(createMessage());
    }
}

function isSolutionValid(puzzle: Puzzle, solution: SolutionDatabaseEntry): boolean {
    try {
        verifySolution(
            puzzle,
            unhexifyBytes(solution.program),
            solution.cycles ?? 10000,
            solution.bytes ?? solutionBytesMax,
        );
        
        return true;
    } catch (error) {
        if (error instanceof ProgramVerificationError) {
            return false;
        }

        throw error;
    }
}

(async () => {
    const db = await readSolutionDatabaseAsync();
    const puzzleTitleToData: {
        [puzzleTitle: string]: {
            valid: number,
            invalid: number,
            userIdToFailures: { [userId: string]: number },
        }
    } = {};

    for (const [puzzleTitle, users] of Object.entries(db)) {
        const puzzle = getPuzzle(puzzleTitle);
        const data: typeof puzzleTitleToData[string] = {
            valid: 0,
            invalid: 0,
            userIdToFailures: {},
        };

        puzzleTitleToData[puzzleTitle] = data;
        console.error(`Processing ${puzzleTitle}...`);

        let solutionCount = 0;
        for (const [userId, foci] of Object.entries(users)) {
            for (const [focus, solution] of Object.entries(foci)) {
                for (let i = 0; i < iterations; i++) {
                    if (isSolutionValid(puzzle, solution)) {
                        data.valid++;
                    } else {
                        data.invalid++;

                        const key = `${userId}_${focus}`;
                        data.userIdToFailures[key] = (data.userIdToFailures[key] ?? 0) + 1;
                    }
    
                    ++solutionCount;
                    logIfNeeded(() => `\tSolutions processed: ${solutionCount}`);
                }
            }
        }
    }

    const titles = Object.keys(puzzleTitleToData).sort();

    console.log("\n=== Summary ===\n");
    const maxTitleLength = Object.keys(puzzleTitleToData).reduce((max, title) => Math.max(max, title.length), 0) + 1;
    for (const title of titles) {
        const data = puzzleTitleToData[title];
        console.log(`${title}:${" ".repeat(maxTitleLength - title.length)}Failure rate: ${Math.ceil(data.invalid / (data.valid + data.invalid) * 100)}%`);
    }

    console.log("\n=== Failures ===\n");
    for (const title of titles) {
        const data = puzzleTitleToData[title];
        console.log(`${title}:`);
        for (const [key, failures] of Object.entries(data.userIdToFailures).sort((a, b) => a[0].localeCompare(b[0]))) {
            console.log(`\t${key}\t${Math.ceil(100 * failures / iterations)}%`);
        }
    }
})();
