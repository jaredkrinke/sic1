import * as archive from "./archive.json";
import { Solution } from "./shared";
import { verifySolution } from "./validation";

// Create a list of test cases
interface TestCase {
    userId: string;
    focus: string;
    program: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
}

console.error("Loading test cases...");
let count = 0;
const testCases: { [puzzleName: string]: TestCase[] } = {};
for (const docId in archive) {
    if (docId.startsWith("Puzzle_")) {
        const parts = docId.split("_");
        const [ _, _userId, puzzleName, focus ] = parts;
        const solution = archive[docId].data as Solution;
        const { userId, program, cyclesExecuted, memoryBytesAccessed } = solution;

        // Add to test list
        if (!testCases[puzzleName]) {
            testCases[puzzleName] = [];
        }
        testCases[puzzleName].push({ userId, focus, program, cyclesExecuted, memoryBytesAccessed });
        ++count;
    }
}

// Now run them a bunch of times
const runs = 200;
console.error(`Verifying ${count} test cases, ${runs} times...`);
const failureInfo: { [id: string]: { failureCount: number, errors: string[] }} = {};
for (let run = 0; run < runs; run++) {
    for (const testName in testCases) {
        const testCasesForPuzzle = testCases[testName];
        for (const testCase of testCasesForPuzzle) {
            const { userId, focus, program, cyclesExecuted, memoryBytesAccessed } = testCase;
            try {
                verifySolution({
                    userId,
                    testName,
                    program,
                    cyclesExecuted,
                    memoryBytesAccessed,
                }, true);
            } catch (e) {
                const id = `Puzzle_${userId}_${testName}_${focus}`;
                if (!failureInfo[id]) {
                    failureInfo[id] = {
                        failureCount: 0,
                        errors: [],
                    };
                }

                failureInfo[id].failureCount++;
                failureInfo[id].errors.push(`${e}`);
            }
        }
    }
}

const failureInfosByCount = Object.keys(failureInfo)
    .map(id => ({ id, ...failureInfo[id] }))
    .sort((a, b) => b.failureCount - a.failureCount);

// Log TSV to standard output
console.log(["Puzzle", "UserId", "Focus", "FailureRate", "ShuffledErrors", "RandomErrors"].join("\t"));
for (const info of failureInfosByCount) {
    const { id, errors, failureCount } = info;
    const errorTypes = {};
    for (const t of ["shuffled", "random"]) {
        errorTypes[t] = errors.reduce((sum, message) => sum + ((message.indexOf(t) > 0) ? 1 : 0), 0);
    }

    const [ _, userId, puzzleName, focus ] = id.split("_");
    console.log([puzzleName, userId, focus, failureCount / runs * 100, errorTypes["shuffled"], errorTypes["random"]].join("\t"));
}

// Log details to standard error
for (const info of failureInfosByCount) {
    const { id, errors } = info;
    console.error(`\n${id}`);
    for (const error of errors) {
        console.error(error);
    }
}

console.error(`\n${failureInfosByCount.length} failures`);
