import "mocha";
import { puzzles } from "../ts/puzzles";
import * as assert from "assert";

describe("Random test validators", () => {
    puzzles.forEach(group => {
        describe(group.groupTitle, () => {
            group.list.forEach(puzzle => {
                it(puzzle.title, () => {
                    const io = puzzle.io;
                    io.forEach(row => {
                        const input = row[0];
                        const inputSequence = (typeof(input) === "number") ? [input] : input;
                        const output = row[1];
                        const outputSequence = (typeof(output) === "number") ? [output] : output;
                        assert.deepStrictEqual(outputSequence, puzzle.getExpectedOutput(inputSequence));
                    });

                    const randomInputSequence = puzzle.createRandomTest();
                    const expectedOutputSequence = puzzle.getExpectedOutput(randomInputSequence);
                    console.log(`[${randomInputSequence.join(", ")}] => [${expectedOutputSequence.join(", ")}]`);
                });
            })
        });
    });
});
