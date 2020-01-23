import "mocha";
import * as assert from "assert";
import * as sic1 from "../src/sic1asm";
const { Parser, Interpreter } = sic1;

describe("SIC-1 Assembler", () => {
    describe("Valid lines", () => {
        it("subleq 2 constants", () => {
            const parsed = (new Parser()).assembleLine("subleq 1, 2");
            assert.equal(parsed.instruction, sic1.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], 1);
            assert.strictEqual(parsed.expressions[1], 2);
            assert.strictEqual(parsed.expressions[2], 3);
        });

        it("subleq 3 constants", () => {
            const parsed = (new Parser()).assembleLine("subleq 1, 2, 4");
            assert.equal(parsed.instruction, sic1.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], 1);
            assert.strictEqual(parsed.expressions[1], 2);
            assert.strictEqual(parsed.expressions[2], 4);
        });

        it("subleq 2 references", () => {
            const parsed = (new Parser()).assembleLine("subleq @one, @two");
            assert.equal(parsed.instruction, sic1.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.deepEqual(parsed.expressions[0], { label: "@one", offset: 0 });
            assert.deepEqual(parsed.expressions[1], { label: "@two", offset: 0 });
            assert.strictEqual(parsed.expressions[2], 3);
        });

        it("subleq 3 references", () => {
            const parsed = (new Parser()).assembleLine("subleq @one, @two, @three");
            assert.equal(parsed.instruction, sic1.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.deepEqual(parsed.expressions[0], { label: "@one", offset: 0 });
            assert.deepEqual(parsed.expressions[1], { label: "@two", offset: 0 });
            assert.deepEqual(parsed.expressions[2], { label: "@three", offset: 0 });
        });

        it("subleq 3 references with offsets", () => {
            const parsed = (new Parser()).assembleLine("subleq @one+1, @two-1, @three+9");
            assert.equal(parsed.instruction, sic1.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.deepEqual(parsed.expressions[0], { label: "@one", offset: 1 });
            assert.deepEqual(parsed.expressions[1], { label: "@two", offset: -1 });
            assert.deepEqual(parsed.expressions[2], { label: "@three", offset: 9 });
        });

        it(".data constant", () => {
            const parsed = (new Parser()).assembleLine(".data 9");
            assert.equal(parsed.instruction, sic1.Command.dataDirective);
            assert.strictEqual(parsed.expressions.length, 1);
            assert.strictEqual(parsed.expressions[0], 9);
        });

        it(".data reference", () => {
            const parsed = (new Parser()).assembleLine(".data @one");
            assert.equal(parsed.instruction, sic1.Command.dataDirective);
            assert.strictEqual(parsed.expressions.length, 1);
            assert.deepEqual(parsed.expressions[0], { label: "@one", offset: 0 });
        });

        it(".data reference with offset", () => {
            const parsed = (new Parser()).assembleLine(".data @one-99");
            assert.equal(parsed.instruction, sic1.Command.dataDirective);
            assert.strictEqual(parsed.expressions.length, 1);
            assert.deepEqual(parsed.expressions[0], { label: "@one", offset: -99 });
        });
    });

    describe("Invalid lines", () => {
        it("subleq no arguments", () => {
            assert.throws(() => (new Parser()).assembleLine("subleq"));
        });

        it("subleq too few arguments", () => {
            assert.throws(() => (new Parser()).assembleLine("subleq 1"));
        });

        it("subleq too many arguments", () => {
            assert.throws(() => (new Parser()).assembleLine("subleq 1, 2, 3, 4"));
        });

        // TODO: Consider allowing this...
        it("subleq no commas", () => {
            assert.throws(() => (new Parser()).assembleLine("subleq 1 2 3"));
        });

        it(".data  no arguments", () => {
            assert.throws(() => (new Parser()).assembleLine(".data"));
        });

        it(".data too many arguments", () => {
            assert.throws(() => (new Parser()).assembleLine(".data 1, 2"));
        });

        // TODO: Fix in the library!
        // it(".data no commas", () => {
        //     assert.throws(() => (new Parser()).assembleLine(".data 1 2"));
        // });
    });

    describe("Valid programs", () => {
        it("Single instruction", () => {
            const program = (new Parser()).assemble(`
                subleq @OUT, @IN
            `.split("\n"));

            assert.deepEqual(program.bytes, [sic1.Constants.addressOutput, sic1.Constants.addressInput, 3]);
        });

        it("Negation loop", () => {
            const program = (new Parser()).assemble(`
                @loop:
                subleq @OUT, @IN
                subleq @zero, @zero, @loop
                
                @zero: .data 0
            `.split("\n"));

            assert.deepEqual(
                program.bytes,
                [
                    sic1.Constants.addressOutput, sic1.Constants.addressInput, 3,
                    6, 6, 0,
                    0
                ]);

            assert.deepEqual(program.variables, [ { symbol: "@zero", address: 6 } ]);

            assert.strictEqual(program.sourceMap[0].instruction, sic1.Command.subleqInstruction);
            assert.strictEqual(program.sourceMap[0].lineNumber, 2);

            assert.strictEqual(program.sourceMap[6].instruction, sic1.Command.dataDirective);
            assert.strictEqual(program.sourceMap[6].lineNumber, 5);
            assert.strictEqual(program.sourceMap[6].source.trim(), "@zero: .data 0");
        });
    });

    describe("Invalid programs", () => {
        it("Missing label", () => {
            assert.throws(() => new Parser().assemble(`
                subleq @OUT, @IN
                subleq @zero, @zero, @loop

                @zero: .data 0
            `.split("\n")));
        });

        it("Missing variable", () => {
            assert.throws(() => new Parser().assemble(`
                @loop:
                subleq @OUT, @IN
                subleq @zero, @zero, @loop
            `.split("\n")));
        });
    });
});

describe("SIC-1 Interpreter", () => {
    it("Negation input/output", () => {
        const inputs = [4, 5, 100, 101];
        const expectedOutputs = inputs.map(n => -n);
        let inputIndex = 0;
        let outputIndex = 0;

        const interpreter = new Interpreter(new Parser().assemble(`
            @loop:
            subleq @OUT, @IN
            subleq @zero, @zero, @loop

            @zero: .data 0
        `.split("\n")), {
            readInput: () => inputs[inputIndex++],
            writeOutput: n => assert.strictEqual(n, expectedOutputs[outputIndex++]),
        });

        assert.strictEqual(interpreter.isRunning(), true);

        let steps = 0;
        while (outputIndex < expectedOutputs.length) {
            if (++steps > 100) {
                assert.fail("Execution did not complete");
                break;
            }

            interpreter.step();
        }
    });

    it("Callbacks", () => {
        let firstUpdate = true;
        let secondUpdate = true;
        let firstWriteAfterUpdate = true;
        const interpreter = new Interpreter(new Parser().assemble(`
            subleq @tmp, @five
            subleq @tmp, @tmp, @HALT

            @five: .data 5
            @tmp: .data 0
        `.split("\n")), {
            onWriteMemory: (address, byte) => {
                if (!firstUpdate && firstWriteAfterUpdate) {
                    firstWriteAfterUpdate = false;
                    assert.strictEqual(address, 7);
                    assert.strictEqual(byte, 0xfb);
                }
            },

            onHalt: (data) => {
                assert.strictEqual(data.cyclesExecuted, 2);
                assert.strictEqual(data.memoryBytesAccessed, 8);
            },

            onStateUpdated: data => {
                if (firstUpdate) {
                    firstUpdate = false;
                    assert.strictEqual(data.running, true);
                    assert.strictEqual(data.ip, 0);
                    assert.strictEqual(data.target, 7);
                    assert.strictEqual(data.sourceLineNumber, 1);
                    assert.strictEqual(data.source.trim(), "subleq @tmp, @five");
                    assert.strictEqual(data.cyclesExecuted, 0);
                    assert.strictEqual(data.memoryBytesAccessed, 0);
                    assert.deepEqual(data.variables, [
                        { label: "@five", value: 5 },
                        { label: "@tmp", value: 0 },
                    ]);
                } else if (secondUpdate) {
                    secondUpdate = false;
                    assert.strictEqual(data.running, true);
                    assert.strictEqual(data.ip, 3);
                    assert.strictEqual(data.target, 7);
                    assert.strictEqual(data.sourceLineNumber, 2);
                    assert.strictEqual(data.source.trim(), "subleq @tmp, @tmp, @HALT");
                    assert.strictEqual(data.cyclesExecuted, 1);
                    assert.strictEqual(data.memoryBytesAccessed, 5);
                    assert.deepEqual(data.variables, [
                        { label: "@five", value: 5 },
                        { label: "@tmp", value: -5 },
                    ]);
                }
            },
        });

        interpreter.run();
    });
});
