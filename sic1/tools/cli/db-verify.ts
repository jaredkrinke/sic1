// Tool for verifying solutions and writing out statistics and failing users

import { Puzzle, puzzleFlatArray, solutionBytesMax } from "../../shared/puzzles";
import { cyclesExecutedMax, isSolutionValid, readSolutionDatabaseAsync, validationIterations } from "./shared";

const iterations = 200;

const [ node, script, puzzleTitleArg ] = process.argv;

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

(async () => {
    const db = await readSolutionDatabaseAsync();
    const puzzleTitleToData: {
        [puzzleTitle: string]: {
            valid: number,
            invalid: number,
            cyclesMin: number,
            cyclesMax: number,
            bytesMin: number,
            bytesMax: number,
            userIdToFailures: {
                [userId: string]: {
                    count: number,
                    cycles?: number,
                    bytes?: number,
                },
            },
        }
    } = {};

    for (const [puzzleTitle, users] of Object.entries(db)) {
        const puzzle = getPuzzle(puzzleTitle);
        if (puzzleTitleArg && (puzzle.title !== puzzleTitleArg)) {
            continue;
        }

        const data: typeof puzzleTitleToData[string] = {
            valid: 0,
            invalid: 0,
            cyclesMin: cyclesExecutedMax,
            cyclesMax: 0,
            bytesMin: solutionBytesMax,
            bytesMax: 0,
            userIdToFailures: {},
        };

        puzzleTitleToData[puzzleTitle] = data;
        console.error(`Processing ${puzzleTitle}...`);

        let solutionCount = 0;
        for (const [userId, foci] of Object.entries(users)) {
            for (const [focus, solution] of Object.entries(foci)) {
                let i: number;
                let validIterations = 0;
                for (i = 0; i < validationIterations; i++) {
                    if (isSolutionValid(puzzle, solution)) {
                        ++validIterations;
                        data.valid++;
                    } else {
                        data.invalid++;

                        const key = `${userId}_${focus}`;
                        if (!data.userIdToFailures[key]) {
                            data.userIdToFailures[key] = { count: 0 };
                        }

                        const failureData = data.userIdToFailures[key];
                        failureData.count++;

                        if (solution.cycles) {
                            failureData.cycles = Math.min(failureData.cycles ?? cyclesExecutedMax, solution.cycles);
                        }

                        if (solution.bytes) {
                            failureData.bytes = Math.min(failureData.bytes ?? solutionBytesMax, solution.bytes);
                        }
                    }
    
                    ++solutionCount;
                    logIfNeeded(() => `\tSolutions processed: ${solutionCount}`);
                }

                if (validIterations === validationIterations) {
                    // Solution was robustly valid; check to see if it's the *best* solution
                    if (solution.cycles) {
                        data.cyclesMin = Math.min(data.cyclesMin, solution.cycles);
                        data.cyclesMax = Math.max(data.cyclesMax, solution.cycles);
                    }

                    if (solution.bytes) {
                        data.bytesMin = Math.min(data.bytesMin, solution.bytes);
                        data.bytesMax = Math.max(data.bytesMax, solution.bytes);
                    }
                }
            }
        }
    }

    const titles = puzzleTitleArg ? [puzzleTitleArg] : Object.keys(puzzleTitleToData).sort();

    console.log("\n=== Summary ===\n");
    const maxTitleLength = Object.keys(puzzleTitleToData).reduce((max, title) => Math.max(max, title.length), 0) + 1;
    for (const title of titles) {
        const data = puzzleTitleToData[title];
        console.log(`${title}:${" ".repeat(maxTitleLength - title.length)}Failure rate: ${Math.ceil(data.invalid / (data.valid + data.invalid) * 100)}%`);
    }

    console.log("\n=== Failures ===\n");
    for (const title of titles) {
        const data = puzzleTitleToData[title];
        console.log(`${title}: (cycles: ${data.cyclesMin} - ${data.cyclesMax}, bytes: ${data.bytesMin} - ${data.bytesMax})`);
        for (const [key, failureData] of Object.entries(data.userIdToFailures).sort((a, b) => a[0].localeCompare(b[0]))) {
            console.log(`\t${key}\t${Math.ceil(100 * failureData.count / iterations)}% (cycles: ${failureData.cycles}, bytes: ${failureData.bytes})`);
        }
    }
})();
