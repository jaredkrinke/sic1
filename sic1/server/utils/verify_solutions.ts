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

console.log("Loading test cases...");
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

// Now run them
console.log(`Verifying ${count} test cases...`)
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
            });
        } catch (e) {
            console.log(`*** Error on Puzzle_${userId}_${testName}_${focus}: ${e}`);
        }
    }
}
