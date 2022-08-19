import { AssembledProgram, Emulator } from "sic1asm";
import { Puzzle, shuffleInPlace, generatePuzzleTest, puzzles } from "sic1-shared";
import { Solution } from "./shared";

// This file contains logic for verifying solutions
// Note: Database integration is copied from src/api.ts rather than shared because I haven't confirmed that sharing the code is supported when deploying to Netlify

const identity = <T extends unknown>(x: T) => x;
const solutionBytesMax = 256;

function getPuzzle(title: string): Puzzle {
    for (const group of puzzles) {
        for (const puzzle of group.list) {
            if (puzzle.title === title) {
                return puzzle;
            }
        }
    }

    throw `Test not found: ${title}`;
}

function verifyProgram(context: string, includeIO: boolean, inputs: number[], expectedOutputs: number[], program: AssembledProgram, maxCyclesExecuted: number, maxMemoryBytesAccessed: number): void {
    let inputIndex = 0;
    let outputIndex = 0;

    let correct = true;
    let errorContext = "";
    const emulator = new Emulator(program, {
        readInput: () => inputs[inputIndex++],
        writeOutput: n => {
            const expected = expectedOutputs[outputIndex++];
            if (n !== expected) {
                correct = false;
                if (errorContext === "") {
                    errorContext = `expected ${expected} but got ${n} instead`;
                }
            }
        },
    });

    while (correct && outputIndex < expectedOutputs.length && emulator.getCyclesExecuted() <= maxCyclesExecuted && emulator.getMemoryBytesAccessed() <= maxMemoryBytesAccessed) {
        emulator.step();
    }

    if (emulator.getCyclesExecuted() > maxCyclesExecuted || emulator.getMemoryBytesAccessed() > maxMemoryBytesAccessed) {
        throw `Execution during ${context} did not complete within ${maxCyclesExecuted} cycles and ${maxMemoryBytesAccessed} bytes`;
    }

    if (!correct) {
        throw `Incorrect output produced during ${context} (${errorContext}); IO: ${includeIO ? `(${inputs.join(", ")}) => (${expectedOutputs.join(", ")})` : "not shown"}`;
    }
}

const verificationMaxCycles = 100000;
export function verifySolution(solution: Solution, includeIO: boolean = false): void {
    const puzzle = getPuzzle(solution.testName);
    const test = generatePuzzleTest(puzzle);
    const bytes: number[] = [];
    for (let i = 0; i < solution.program.length; i += 2) {
        bytes.push(parseInt(solution.program.substr(i, 2), 16));
    }

    const program: AssembledProgram = {
        bytes,
        sourceMap: [],
        variables: [],
    };

    // Verify using standard input and supplied stats
    verifyProgram("standard input", includeIO, test.testSets[0].input, test.testSets[0].output, program, solution.cyclesExecuted, solution.memoryBytesAccessed);

    // Verify using shuffled standard input (note: this ensures the order is different)
    const shuffledStandardIO = puzzle.io.slice();
    const originalFirst = shuffledStandardIO[0];
    shuffleInPlace(shuffledStandardIO);

    // Ensure not identical to standard
    if (originalFirst === shuffledStandardIO[0] && shuffledStandardIO.length > 1) {
        shuffledStandardIO[0] = shuffledStandardIO[1];
        shuffledStandardIO[1] = originalFirst;
    }

    verifyProgram(
        "shuffled input",
        includeIO,
        identity<number[]>([]).concat(...shuffledStandardIO.map(a => a[0])),
        identity<number[]>([]).concat(...shuffledStandardIO.map(a => a[1])),
        program,
        verificationMaxCycles,
        solutionBytesMax
    );

    if (puzzle.test) {
        // Verify using random input
        verifyProgram("random input", includeIO, test.testSets[1].input, test.testSets[1].output, program, verificationMaxCycles, solutionBytesMax);
    }
}
