import "mocha";
import { puzzles, shuffleInPlace } from "../../shared/puzzles";
import * as assert from "assert";

describe("Random test validators", () => {
    puzzles.forEach(group => { describe(group.groupTitle, () => {
        group.list.forEach(puzzle => { it(puzzle.title, () => {
            if (puzzle.test) {
                const inputs = [];
                const outputs = [];
                puzzle.io.forEach(row => {
                    const input = row[0];
                    const output = row[1];
                    inputs.push(input);
                    outputs.push(output);
                });

                assert.deepStrictEqual(outputs, puzzle.test.getExpectedOutput(inputs));

                let randomInputSequence = puzzle.test.createRandomTest();
                if (puzzle.test.fixed) {
                    randomInputSequence = randomInputSequence.concat(puzzle.test.fixed);
                    shuffleInPlace(randomInputSequence);
                }

                const expectedOutputSequence = puzzle.test.getExpectedOutput(randomInputSequence);
                for (let i = 0; i < randomInputSequence.length; i++) {
                    console.log(`[${randomInputSequence[i].join(", ")}] => [${expectedOutputSequence[i].join(", ")}]`);
                }
            }
        });});
    });});
});
