import "mocha";
import * as assert from "assert";
import * as sic1 from "../src/sic1asm";
const { Assembler, Emulator } = sic1;

describe("SIC-1 Assembler", () => {
    describe("Valid lines", () => {
        it("subleq 2 constants", () => {
            const parsed = Assembler.parseLine("subleq 1, 2");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [1, 2]);
        });

        it("subleq 2 constants with comment", () => {
            const parsed = Assembler.parseLine("subleq 1, 2;, 5");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [1, 2]);
        });

        it("subleq 3 constants", () => {
            const parsed = Assembler.parseLine("subleq 1, 2, 4");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [1, 2, 4]);
        });

        it("subleq 2 references", () => {
            const parsed = Assembler.parseLine("subleq @one, @two");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "@one", offset: 0 },
                { label: "@two", offset: 0 },
            ]);
        });

        it("subleq 3 references", () => {
            const parsed = Assembler.parseLine("subleq @one, @two, @three");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "@one", offset: 0 },
                { label: "@two", offset: 0 },
                { label: "@three", offset: 0 },
            ]);
        });

        it("subleq 3 references with offsets", () => {
            const parsed = Assembler.parseLine("subleq @one+1, @two-1, @three+9");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "@one", offset: 1 },
                { label: "@two", offset: -1 },
                { label: "@three", offset: 9 },
            ]);
        });

        it(".data constant", () => {
            const parsed = Assembler.parseLine(".data 9");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [9]);
        });

        it(".data reference", () => {
            const parsed = Assembler.parseLine(".data @one");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "@one", offset: 0 },
            ]);
        });

        it(".data reference with offset", () => {
            const parsed = Assembler.parseLine(".data @one-99");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "@one", offset: -99 },
            ]);
        });
    });

    describe("Invalid lines", () => {
        it("subleq no arguments", () => {
            assert.throws(() => Assembler.parseLine("subleq"));
        });

        it("subleq too few arguments", () => {
            assert.throws(() => Assembler.parseLine("subleq 1"));
        });

        it("subleq too many arguments", () => {
            assert.throws(() => Assembler.parseLine("subleq 1, 2, 3, 4"));
        });

        // TODO: Consider allowing this...
        it("subleq no commas", () => {
            assert.throws(() => Assembler.parseLine("subleq 1 2 3"));
        });

        it(".data  no arguments", () => {
            assert.throws(() => Assembler.parseLine(".data"));
        });

        it(".data too many arguments", () => {
            assert.throws(() => Assembler.parseLine(".data 1, 2"));
        });

        it("Max length", () => {
            const lines = [];
            for (let i = 0; i < sic1.Constants.addressUserMax; i++) {
                lines.push(".data 1");
            }

            const program = Assembler.assemble(lines);
            assert.strictEqual(program.bytes.length, sic1.Constants.addressUserMax);
            for (let byte of program.bytes) {
                assert.strictEqual(byte, 1);
            }
        });

        // TODO: Fix in the library! Note: I think this would be fixed by making commas optional.
        // it(".data no commas", () => {
        //     assert.throws(() => Assembler.assembleLine(".data 1 2"));
        // });
    });

    describe("Valid programs", () => {
        it("Single instruction", () => {
            const program = Assembler.assemble(`
                subleq @OUT, @IN
            `.split("\n"));

            assert.deepEqual(program.bytes, [sic1.Constants.addressOutput, sic1.Constants.addressInput, 3]);
        });

        it("Negation loop", () => {
            const program = Assembler.assemble(`
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

            assert.deepEqual(program.variables, [ { label: "@zero", address: 6 } ]);

            assert.strictEqual(program.sourceMap[0].command, sic1.Command.subleqInstruction);
            assert.strictEqual(program.sourceMap[0].lineNumber, 2);

            assert.strictEqual(program.sourceMap[6].command, sic1.Command.dataDirective);
            assert.strictEqual(program.sourceMap[6].lineNumber, 5);
            assert.strictEqual(program.sourceMap[6].source.trim(), "@zero: .data 0");
        });
    });

    describe("Invalid programs", () => {
        it("Missing label", () => {
            assert.throws(() => Assembler.assemble(`
                subleq @OUT, @IN
                subleq @zero, @zero, @loop

                @zero: .data 0
            `.split("\n")));
        });

        it("Missing variable", () => {
            assert.throws(() => Assembler.assemble(`
                @loop:
                subleq @OUT, @IN
                subleq @zero, @zero, @loop
            `.split("\n")));
        });

        it("Too long", () => {
            const lines: string[] = [];
            for (let i = 0; i < sic1.Constants.addressUserMax + 1; i++) {
                lines.push(".data 1");
            }

            assert.throws(() => Assembler.assemble(lines));
        });
    });
});

describe("SIC-1 Emulator", () => {
    it("Negation input/output", () => {
        const inputs = [4, 5, 100, 101];
        const expectedOutputs = inputs.map(n => -n);
        let inputIndex = 0;
        let outputIndex = 0;

        const emulator = new Emulator(Assembler.assemble(`
            @loop:
            subleq @OUT, @IN
            subleq @zero, @zero, @loop

            @zero: .data 0
        `.split("\n")), {
            readInput: () => inputs[inputIndex++],
            writeOutput: n => assert.strictEqual(n, expectedOutputs[outputIndex++]),
        });

        assert.strictEqual(emulator.isRunning(), true);

        let steps = 0;
        while (outputIndex < expectedOutputs.length) {
            if (++steps > 100) {
                assert.fail("Execution did not complete");
                break;
            }

            emulator.step();
        }
    });

    it("Callbacks", () => {
        let firstUpdate = true;
        let secondUpdate = true;
        let firstWriteAfterUpdate = true;
        const emulator = new Emulator(Assembler.assemble(`
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

        emulator.run();
    });
});
