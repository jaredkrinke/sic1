import "mocha";
import { puzzles } from "../ts/puzzles";
import * as assert from "assert";

describe("Random test validators", () => {
    puzzles.forEach(group => {
        describe(group.groupTitle, () => {
            group.list.forEach(puzzle => {
                it(puzzle.title, () => {
                    const io = puzzle.io;
                    const inputs = [];
                    const outputs = [];
                    io.forEach(row => {
                        const input = row[0];
                        const output = row[1];
                        inputs.push(input);
                        outputs.push(output);
                    });

                    assert.deepStrictEqual(outputs, puzzle.getExpectedOutput(inputs));

                    const randomInputSequence = puzzle.createRandomTest();
                    const expectedOutputSequence = puzzle.getExpectedOutput(randomInputSequence);
                    for (let i = 0; i < randomInputSequence.length; i++) {
                        console.log(`[${randomInputSequence[i].join(", ")}] => [${expectedOutputSequence[i].join(", ")}]`);
                    }
                });
            })
        });
    });
});
