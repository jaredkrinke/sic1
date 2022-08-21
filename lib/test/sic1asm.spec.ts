import "mocha";
import * as assert from "assert";
import * as sic1 from "../src/sic1asm";
const { Tokenizer, TokenType, Assembler, Emulator, CompilationError, Constants } = sic1;

describe("SIC-1 Assembler", () => {
    describe("Tokenizer", () => {
        it("Empty line", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine(""), []);
        });

        it("White space", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine("   "), []);
        });

        it("Instruction", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine("subleq 0, @one, @two+3"), [
                { tokenType: TokenType.command, raw: "subleq" },
                { tokenType: TokenType.numberLiteral, raw: "0" },
                { tokenType: TokenType.comma, raw: "," },
                { tokenType: TokenType.reference, raw: "@one", groups: { name: "one" } },
                { tokenType: TokenType.comma, raw: "," },
                { tokenType: TokenType.reference, raw: "@two+3", groups: { name: "two", offset: "+3" } },
            ]);
        });

        it("Variable", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine("@var: .data 7; Comment"), [
                { tokenType: TokenType.label, raw: "@var:", groups: { name: "var" } },
                { tokenType: TokenType.command, raw: ".data" },
                { tokenType: TokenType.numberLiteral, raw: "7" },
            ]);
        });

        it("Character", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine(".data 'H'"), [
                { tokenType: TokenType.command, raw: ".data" },
                { tokenType: TokenType.characterLiteral, raw: "'H'", groups: { character: "H" } },
            ]);
        });

        it("Character (negated)", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine(".data -'H'"), [
                { tokenType: TokenType.command, raw: ".data" },
                { tokenType: TokenType.characterLiteral, raw: "-'H'", groups: { character: "H" } },
            ]);
        });

        it("Escaped character", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine(".data '\\n'"), [
                { tokenType: TokenType.command, raw: ".data" },
                { tokenType: TokenType.characterLiteral, raw: "'\\n'", groups: { character: "\\n" } },
            ]);
        });

        it("String", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine(".data \"with \\\"quotes\\\"\""), [
                { tokenType: TokenType.command, raw: ".data" },
                { tokenType: TokenType.stringLiteral, raw: "\"with \\\"quotes\\\"\"", groups: { characters: "with \\\"quotes\\\"" } },
            ]);
        });

        it("String (negated)", () => {
            assert.deepStrictEqual(Tokenizer.tokenizeLine(".data -\"with \\\"quotes\\\"\""), [
                { tokenType: TokenType.command, raw: ".data" },
                { tokenType: TokenType.stringLiteral, raw: "-\"with \\\"quotes\\\"\"", groups: { characters: "with \\\"quotes\\\"" } },
            ]);
        });
    });

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

        it("subleq no commas", () => {
            const parsed = Assembler.parseLine("subleq 2 3 4");
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [2, 3, 4]);
        });

        it("subleq 2 references", () => {
            const line = "subleq @one, @two";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "one", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "two", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
            ]);
        });

        it("subleq 3 references", () => {
            const line = "subleq @one, @two, @three";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "one", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "two", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "three", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
            ]);
        });

        it("subleq 3 references with offsets", () => {
            const line = "subleq @one+1, @two-1, @three+9";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "one", offset: 1, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "two", offset: -1, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "three", offset: 9, context: { sourceLineNumber: 1, sourceLine: line } },
            ]);
        });

        it("subleq 3 references with offsets, no commas", () => {
            const line = "subleq @one+1 @two-1 @three+9";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.subleqInstruction);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "one", offset: 1, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "two", offset: -1, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "three", offset: 9, context: { sourceLineNumber: 1, sourceLine: line } },
            ]);
        });

        it(".data constant", () => {
            const parsed = Assembler.parseLine(".data 9");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [9]);
        });

        it(".data character", () => {
            const parsed = Assembler.parseLine(".data 'H'");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, ["H".charCodeAt(0)]);
        });

        it(".data character (negated)", () => {
            const parsed = Assembler.parseLine(".data -'H'");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [(-("H".charCodeAt(0))) & 0xff]);
        });

        it(".data escaped characters", () => {
            assert.deepStrictEqual(Assembler.parseLine(".data '\\\\'").expressions, ["\\".charCodeAt(0)]);
            assert.deepStrictEqual(Assembler.parseLine(".data '\\''").expressions, ["'".charCodeAt(0)]);
            assert.deepStrictEqual(Assembler.parseLine(".data '\\\"'").expressions, ['"'.charCodeAt(0)]);
            assert.deepStrictEqual(Assembler.parseLine(".data '\\0'").expressions, [0]);
            assert.deepStrictEqual(Assembler.parseLine(".data '\\n'").expressions, ["\n".charCodeAt(0)]);
            assert.deepStrictEqual(Assembler.parseLine(".data -'\\n'").expressions, [(-("\n".charCodeAt(0))) & 0xff]);
        });

        it(".data string", () => {
            const parsed = Assembler.parseLine(".data \"\\\"q\\\"\"");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, ['"'.charCodeAt(0), 'q'.charCodeAt(0), '"'.charCodeAt(0), 0]);
        });

        it(".data string (negated)", () => {
            const parsed = Assembler.parseLine(".data -\"\\\"'\\\"\"");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [(-('"'.charCodeAt(0))) & 0xff, (-("'".charCodeAt(0))) & 0xff, (-('"'.charCodeAt(0))) & 0xff, 0]);
        });

        it(".data reference", () => {
            const line = ".data @one";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "one", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
            ]);
        });

        it(".data reference with offset", () => {
            const line = ".data @one-99";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [
                { label: "one", offset: -99, context: { sourceLineNumber: 1, sourceLine: line } },
            ]);
        });

        it(".data multiple values", () => {
            const parsed = Assembler.parseLine(".data 1, 2");
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [1, 2]);
        });

        it(".data references, no commas", () => {
            const line = ".data 1 @two @three-45 @six+7";
            const parsed = Assembler.parseLine(line);
            assert.equal(parsed.command, sic1.Command.dataDirective);
            assert.deepStrictEqual(parsed.expressions, [
                1,
                { label: "two", offset: 0, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "three", offset: -45, context: { sourceLineNumber: 1, sourceLine: line } },
                { label: "six", offset: 7, context: { sourceLineNumber: 1, sourceLine: line } },
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
            const line = "subleq 1, 2, 3, 4";
            let match = false;
            try {
                Assembler.parseLine(line);
            } catch (error) {
                if (error instanceof CompilationError) {
                    assert.deepStrictEqual(error.context, { sourceLineNumber: 1, sourceLine: line });
                    match = true;
                }
            }
            assert.ok(match);
        });

        it(".data  no arguments", () => {
            assert.throws(() => Assembler.parseLine(".data"));
        });

        it(".data invalid character", () => {
            assert.throws(() => Assembler.parseLine(".data 'ab'"));
            assert.throws(() => Assembler.parseLine(".data '''"));
        });

        it(".data invalid escape characters", () => {
            assert.throws(() => Assembler.parseLine(".data '\\t'"));
            assert.throws(() => Assembler.parseLine(".data '\\'"));
            assert.throws(() => Assembler.parseLine(".data -'\\'"));
            assert.throws(() => Assembler.parseLine(".data ''"));
        });

        it(".data invalid strings", () => {
            assert.throws(() => Assembler.parseLine('.data "\\"'));
            assert.throws(() => Assembler.parseLine('.data "\\t"'));
            assert.throws(() => Assembler.parseLine('.data """'));
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

        it(".data directive without label", () => {
            const program = Assembler.assemble(`
                .data 0
            `.split("\n"));

            assert.deepEqual(program.bytes, [0]);
            assert.strictEqual(program.sourceMap[0].command, sic1.Command.dataDirective);
            assert.strictEqual(program.sourceMap[0].lineNumber, 1);
            assert.strictEqual(program.sourceMap[0].source.trim(), ".data 0");
            assert.deepStrictEqual(program.variables, []);
        });
    });

    describe("Error tracing", () => {
        function verifyError(program: string, errorLineNumber: number) {
            const lines = program.split("\n");
            let match = false;
            try {
                Assembler.assemble(lines);
            } catch (error) {
                if (error instanceof CompilationError) {
                    assert.deepStrictEqual(error.context, { sourceLineNumber: errorLineNumber, sourceLine: lines[errorLineNumber - 1] });
                    match = true;
                }
            }
            assert.ok(match, "Got the expected exception");
        }

        it("Invalid value", () => {
            verifyError(`
                subleq @OUT, @IN
                @zero: .data 128
            `, 3);
        });

        it("Invalid address", () => {
            verifyError(`
                subleq @OUT, @IN
                subleq 256, @IN
            `, 3);
        });

        it("Invalid argument count for subleq", () => {
            verifyError(`
                subleq @OUT, @IN
                subleq @OUT
            `, 3);
        });

        it("No arguments for subleq", () => {
            verifyError(`
                subleq @OUT, @IN
                subleq
            `, 3);
        });

        it("No arguments for .data", () => {
            verifyError(`
                subleq @OUT, @IN
                .data
            `, 3);
        });

        it("Invalid command", () => {
            verifyError(`
                subleq @OUT, @IN
                .duh 1
            `, 3);
        });

        it("Label redefinition", () => {
            verifyError(`
                subleq @OUT, @IN
                @tmp: .data 5
                @tmp: .data 6
            `, 4);
        });

        it("Missing label", () => {
            verifyError(`
                subleq @OUT, @IN
                subleq @zero, @zero, @loop

                @zero: .data 0
            `, 3);
        });

        it("Missing variable", () => {
            verifyError(`
                @loop:
                subleq @OUT, @IN
                subleq @zero, @zero, @loop
            `, 4);
        });

        it("Invalid offset", () => {
            verifyError(`
                @loop:
                subleq @OUT, @IN
                subleq @OUT, @IN, @loop-1
            `, 4);
        });

        it("Too long", () => {
            const lines: string[] = [];
            for (let i = 0; i <= sic1.Constants.addressUserMax + 1; i++) {
                lines.push(".data 1");
            }

            assert.throws(() => Assembler.assemble(lines));
        });
    });
});

function verifyProgram(inputs: number[], expectedOutputs: number[], code: string, onWriteMemory?: (address: number, byte: number) => void) {
    let inputIndex = 0;
    let outputIndex = 0;

    const emulator = new Emulator(Assembler.assemble(code.split("\n")), {
        readInput: () => inputs[inputIndex++],
        writeOutput: n => assert.strictEqual(n, expectedOutputs[outputIndex++]),
        onWriteMemory: onWriteMemory ?? undefined,
    });

    assert.strictEqual(emulator.isRunning(), true);

    let steps = 0;
    while (outputIndex < expectedOutputs.length) {
        if (++steps > 1000) {
            assert.fail("Execution did not complete");
            break;
        }

        emulator.step();
    }
}

describe("SIC-1 Emulator", () => {
    it("Negation input/output", () => {
        const inputs = [4, 5, 100, 101];
        verifyProgram(
            inputs,
            inputs.map(n => -n),
            `
            @loop:
            subleq @OUT, @IN
            subleq @zero, @zero, @loop

            @zero: .data 0
        `);
    });

    it("Writes to reserved addresses shouldn't update memory", () => {
        const inputs = [45, 123];
        verifyProgram(
            inputs,
            [-1, -123, 0, 0],
            `
            subleq @IN, @one
            subleq @OUT, @one
            subleq @HALT, @one
            subleq @OUT, @IN
            subleq @OUT, @OUT
            subleq @OUT, @HALT
            @one: .data 1
        `, (address, byte) => {
            if (byte !== 0) {
                assert.notStrictEqual(address, Constants.addressInput, "Writes to @IN should not update memory");
                assert.notStrictEqual(address, Constants.addressOutput, "Writes to @OUT should not update memory");
                assert.notStrictEqual(address, Constants.addressHalt, "Writes to @HALT should not update memory");
            }
        });
    });

    it("Using @IN in the first position should ensure a value is read, but nothing should be written", () => {
        const inputs = [123, 0, -1, -127, 1, 127, 34];
        verifyProgram(
            inputs,
            [-34],
            `
            subleq @IN, @IN             ; Burn an input
            subleq @IN, @zero, @good1   ; Input 0 should branch
            subleq @zero, @zero, @HALT
            @good1:
            subleq @IN, @zero, @good2   ; Input -1 should branch
            subleq @zero, @zero, @HALT
            @good2:
            subleq @IN, @zero, @good3   ; Input -127 should branch
            subleq @zero, @zero, @HALT
            @good3:
            subleq @IN, @zero, @HALT    ; Input 1 should not branch
            subleq @IN, @zero, @HALT    ; Input 127 should not branch
            subleq @OUT, @IN
            @zero: .data 0
        `, (address, byte) => {
            if (byte !== 0) {
                assert.notStrictEqual(address, Constants.addressInput, "Writes to @IN should not update memory");
            }
        });
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

    it("Reset", () => {
        const inputs = [4, 5, 100, 101];
        const expectedOutputs = inputs.slice();
        const code = `
            subleq @tmp, @IN
            subleq @OUT, @tmp
            subleq @zero, @zero, @HALT

            @zero: .data 0
            @tmp: .data 0 ; Note: This is NOT reset! We're relying on the reset function instead.
        `;

        let inputIndex = 0;
        let outputIndex = 0;
    
        const emulator: sic1.Emulator = new Emulator(Assembler.assemble(code.split("\n")), {
            readInput: () => inputs[inputIndex++],
            writeOutput: n => assert.strictEqual(n, expectedOutputs[outputIndex++]),
            onHalt: () => emulator.reset(), // Reset on halt
        });
    
        let steps = 0;
        while (outputIndex < expectedOutputs.length) {
            if (++steps > 1000) {
                assert.fail("Execution did not complete");
                break;
            }
    
            emulator.step();
        }
    });
});
