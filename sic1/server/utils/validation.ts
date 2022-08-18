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

function verifyProgram(inputs: number[], expectedOutputs: number[], program: AssembledProgram, maxCyclesExecuted: number, maxMemoryBytesAccessed: number): void {
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
        throw `Execution did not complete within ${maxCyclesExecuted} cycles and ${maxMemoryBytesAccessed} bytes`;
    }

    if (!correct) {
        throw `Incorrect output produced (${errorContext})`;
    }
}

const verificationMaxCycles = 100000;
export function verifySolution(solution: Solution): void {
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
    verifyProgram(test.testSets[0].input, test.testSets[0].output, program, solution.cyclesExecuted, solution.memoryBytesAccessed);

    // Verify using shuffled standard input (note: this ensures the order is different)
    const shuffeldStandardIO = puzzle.io.slice();
    const originalFirst = shuffeldStandardIO[0];
    shuffleInPlace(shuffeldStandardIO);

    // Ensure not idential to standard
    if (originalFirst === shuffeldStandardIO[0] && shuffeldStandardIO.length > 1) {
        shuffeldStandardIO[0] = shuffeldStandardIO[1];
        shuffeldStandardIO[1] = originalFirst;
    }

    verifyProgram(
        identity<number[]>([]).concat(...shuffeldStandardIO.map(a => a[0])),
        identity<number[]>([]).concat(...shuffeldStandardIO.map(a => a[1])),
        program,
        verificationMaxCycles,
        solutionBytesMax
    );

    if (puzzle.test) {
        // Verify using random input
        verifyProgram(test.testSets[1].input, test.testSets[1].output, program, verificationMaxCycles, solutionBytesMax);
    }
}
