// This is a command line tool for validating downloaded solutions
//
// USAGE: ts-node script.ts <path to JSON file>

import { readFile } from "fs/promises";
import { generatePuzzleTest, puzzleFlatArray, shuffleInPlace } from "../../shared/puzzles";
import { AssembledProgram, Emulator } from "../../../lib/src/sic1asm";
import { Solution } from "./shared";

function verifyProgram(inputs: number[], expectedOutputs: number[], program: AssembledProgram, maxCyclesExecuted: number, maxMemoryBytesAccessed: number, context?: string): boolean {
    let inputIndex = 0;
    let outputIndex = 0;
    let correct = true;

    const assert = {
        fail: (a?, context?) => correct = false,
        strictEqual: (a, b, context?) => {
            if (a !== b) {
                // console.log(`Error: ${a} !== ${b} (${context})`);
                correct = false;
            }
        },
    }
    const emulator = new Emulator(program, {
        readInput: () => inputs[inputIndex++],
        writeOutput: n => {
            const expected = expectedOutputs[outputIndex++];
            if (n !== expected) {
                correct = false;
            }

            assert.strictEqual(n, expected, context);
        },
    });

    assert.strictEqual(emulator.isRunning(), true);

    while (correct && outputIndex < expectedOutputs.length) {
        if (emulator.getCyclesExecuted() > maxCyclesExecuted || emulator.getMemoryBytesAccessed() > maxMemoryBytesAccessed) {
            assert.fail("Execution did not complete", context);
            break;
        }

        emulator.step();
    }

    assert.strictEqual(correct, true, "Successful");

    // console.log(`Cycles: ${emulator.getCyclesExecuted()}; bytes: ${emulator.getMemoryBytesAccessed()}`);

    return correct;
}

function verifySolution(title: string, program: number[]): boolean {
    const puzzle = puzzleFlatArray.find(p => p.title === title);
    const test = generatePuzzleTest(puzzle);
    const maxCycles = 10000;
    const maxBytes = 256;
    let correct = true;

    function validate(value: boolean): void {
        if (!value) {
            correct = false;
        }
    }

    // Verify using standard input
    const assembledProgram: AssembledProgram = {
        bytes: program,
        sourceMap: [],
        variables: [],
    };

    validate(verifyProgram(test.testSets[0].input, test.testSets[0].output, assembledProgram, maxCycles, maxBytes, "Standard"));

    // Verify using shuffled standard input (note: this ensures the order is different)
    const shuffeldStandardIO = puzzle.io.slice();
    const originalFirst = shuffeldStandardIO[0];
    shuffleInPlace(shuffeldStandardIO);

    // Ensure not idential to standard
    if (originalFirst === shuffeldStandardIO[0] && shuffeldStandardIO.length > 1) {
        shuffeldStandardIO[0] = shuffeldStandardIO[1];
        shuffeldStandardIO[1] = originalFirst;
    }

    validate(verifyProgram([].concat(...shuffeldStandardIO.map(a => a[0])), [].concat(...shuffeldStandardIO.map(a => a[1])), assembledProgram, maxCycles, maxBytes, "Standard shuffled"));

    if (puzzle.test) {
        // Verify using random input
        validate(verifyProgram(test.testSets[1].input, test.testSets[1].output, assembledProgram, maxCycles, maxBytes, "Random"));
    }

    return correct;
}

(async () => {
    const [ _exePath, _scriptPath, path ] = process.argv;

    const solutions: Solution[] = JSON.parse(await readFile(path, { encoding: "utf8" }));
    for (const { puzzleTitle, userId, cycles, bytes, program } of solutions) {
        console.log(`${userId}\t(${cycles ? `cycles: ${cycles}` : `bytes: ${bytes}`})${verifySolution(puzzleTitle, program) ? "" : " *** Invalid! ***"}`);
    }
})();
