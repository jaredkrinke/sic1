import "mocha";
import * as assert from "assert";
import * as oisc from "../src/oisc";

describe("OISC", () => {
    describe("Valid lines", () => {
        it("subleq 2 constants", () => {
            const parsed = (new oisc.Parser()).assembleLine("subleq 1, 2");
            assert.equal(parsed.instruction, oisc.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], 1);
            assert.strictEqual(parsed.expressions[1], 2);
            assert.strictEqual(parsed.expressions[2], 3);
        });

        it("subleq 3 constants", () => {
            const parsed = (new oisc.Parser()).assembleLine("subleq 1, 2, 4");
            assert.equal(parsed.instruction, oisc.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], 1);
            assert.strictEqual(parsed.expressions[1], 2);
            assert.strictEqual(parsed.expressions[2], 4);
        });

        it("subleq 2 references", () => {
            const parsed = (new oisc.Parser()).assembleLine("subleq @one, @two");
            assert.equal(parsed.instruction, oisc.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], "@one");
            assert.strictEqual(parsed.expressions[1], "@two");
            assert.strictEqual(parsed.expressions[2], 3);
        });

        it("subleq 3 references", () => {
            const parsed = (new oisc.Parser()).assembleLine("subleq @one, @two, @three");
            assert.equal(parsed.instruction, oisc.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], "@one");
            assert.strictEqual(parsed.expressions[1], "@two");
            assert.strictEqual(parsed.expressions[2], "@three");
        });

        it("subleq 3 references with offsets", () => {
            const parsed = (new oisc.Parser()).assembleLine("subleq @one+1, @two-1, @three+9");
            assert.equal(parsed.instruction, oisc.Command.subleqInstruction);
            assert.strictEqual(parsed.expressions.length, 3);
            assert.strictEqual(parsed.expressions[0], "@one+1");
            assert.strictEqual(parsed.expressions[1], "@two-1");
            assert.strictEqual(parsed.expressions[2], "@three+9");
        });

        it(".data constant", () => {
            const parsed = (new oisc.Parser()).assembleLine(".data 9");
            assert.equal(parsed.instruction, oisc.Command.dataDirective);
            assert.strictEqual(parsed.expressions.length, 1);
            assert.strictEqual(parsed.expressions[0], 9);
        });

        it(".data reference", () => {
            const parsed = (new oisc.Parser()).assembleLine(".data @one");
            assert.equal(parsed.instruction, oisc.Command.dataDirective);
            assert.strictEqual(parsed.expressions.length, 1);
            assert.strictEqual(parsed.expressions[0], "@one");
        });

        it(".data reference with offset", () => {
            const parsed = (new oisc.Parser()).assembleLine(".data @one-99");
            assert.equal(parsed.instruction, oisc.Command.dataDirective);
            assert.strictEqual(parsed.expressions.length, 1);
            assert.strictEqual(parsed.expressions[0], "@one-99");
        });
    });

    describe("Invalid lines", () => {
        it("subleq no arguments", () => {
            assert.throws(() => (new oisc.Parser()).assembleLine("subleq"));
        });

        it("subleq too few arguments", () => {
            assert.throws(() => (new oisc.Parser()).assembleLine("subleq 1"));
        });

        it("subleq too many arguments", () => {
            assert.throws(() => (new oisc.Parser()).assembleLine("subleq 1, 2, 3, 4"));
        });

        // TODO: Consider allowing this...
        it("subleq no commas", () => {
            assert.throws(() => (new oisc.Parser()).assembleLine("subleq 1 2 3"));
        });

        it(".data  no arguments", () => {
            assert.throws(() => (new oisc.Parser()).assembleLine(".data"));
        });

        it(".data too many arguments", () => {
            assert.throws(() => (new oisc.Parser()).assembleLine(".data 1, 2"));
        });

        // TODO: Fix in the library!
        // it(".data no commas", () => {
        //     assert.throws(() => (new oisc.Parser()).assembleLine(".data 1 2"));
        // });
    });

    describe("Valid programs", () => {
        it("Single instruction", () => {
            const program = (new oisc.Parser()).assemble(`
                subleq @OUT, @IN
            `.split("\n"));

            assert.deepEqual(program.bytes, [oisc.addressOutput, oisc.addressInput, 3]);
        });

        it("Negation loop", () => {
            const program = (new oisc.Parser()).assemble(`
                @loop:
                subleq @OUT, @IN
                subleq @zero, @zero, @loop
                
                @zero: .data 0
            `.split("\n"));

            assert.deepEqual(
                program.bytes,
                [
                    oisc.addressOutput, oisc.addressInput, 3,
                    6, 6, 0,
                    0
                ]);

            assert.deepEqual(program.variables, [ { symbol: "@zero", address: 6 } ]);

            assert.strictEqual(program.sourceMap[0].instruction, oisc.Command.subleqInstruction);
            assert.strictEqual(program.sourceMap[0].lineNumber, 2);

            assert.strictEqual(program.sourceMap[6].instruction, oisc.Command.dataDirective);
            assert.strictEqual(program.sourceMap[6].lineNumber, 5);
            assert.strictEqual(program.sourceMap[6].source.trim(), "@zero: .data 0");
        });
    });
});
