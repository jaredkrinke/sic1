import { AssembledProgram, Assembler, Emulator } from "sic1asm";

export enum Format {
    numbers, // Default
    characters,
    strings,
}

export type PuzzleSong = "default" | "light" | "major" | "menu";

export interface Puzzle {
    title: string;
    minimumSolvedToUnlock: number;
    song?: PuzzleSong;
    description: string;
    test?: {
        fixed?: number[][][];
        createRandomTest: () => number[][];
        getExpectedOutput: (input: number[][]) => number[][];
    };
    code?: string;
    io: number[][][];
    inputFormat?: Format;
    outputFormat?: Format;
}

export interface PuzzleGroup {
    groupTitle: string;
    list: Puzzle[];
}

export interface PuzzleTestSet {
    input: number[];
    output: number[];
}

export interface PuzzleTest {
    testSets: PuzzleTestSet[];
}

function flattenFixedTest(test: number[][][]): { input: number[], output: number[] } {
    let input: number[] = [];
    let output: number[] = [];
    test.forEach(row => {
        input = input.concat(row[0]);
        output = output.concat(row[1]);
    });

    return { input, output };
}

function arrayEqual(a: number[], b: number[]): boolean {
    if (a.length === b.length) {
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

export function generatePuzzleTest(puzzle: Puzzle): PuzzleTest {
    const testSets: PuzzleTestSet[] = [];

    // Standard tests
    const { input, output } = flattenFixedTest(puzzle.io);
    testSets.push({ input, output });

    // Extra and random tests
    if (puzzle.test) {
        // Fixed and random test sets
        for (const fixedInput of (puzzle.test.fixed ?? []).concat([puzzle.test.createRandomTest()])) {
            testSets.push({
                input: ([] as number[]).concat(...fixedInput),
                output: ([] as number[]).concat(...puzzle.test.getExpectedOutput(fixedInput)),
            });
        }

        // Also add one that's similar to the first test set (but not identical!)
        while (true) {
            const test = puzzle.io.slice();
            if (test.length <= 1) {
                // Only one input set, so no real need to duplicate a random test
                break;
            }

            const moreRandomInputGroups = puzzle.test.createRandomTest();
            const randomIndex = Math.floor(moreRandomInputGroups.length * Math.random());
            test.splice(test.length - 1, 1, [moreRandomInputGroups[randomIndex], puzzle.test.getExpectedOutput(moreRandomInputGroups)[randomIndex]]);

            const testSet = flattenFixedTest(test);
            if (!arrayEqual(testSet.input, input) && !arrayEqual(testSet.output, output)) {
                testSets.push(testSet);
                break;
            }
        }
    }

    return {
        testSets,
    }
}

// Backend/offline solution validation
export class ProgramVerificationError extends Error {
    constructor(message: string, public errorContext: { inputs: number[], inputIndex?: number }) {
        super(message);

        // Ensure prototype is ProgramVerificationError
        Object.setPrototypeOf(this, ProgramVerificationError.prototype);
    }
}

function verifyProgram(context: string, inputs: number[], expectedOutputs: number[], program: AssembledProgram, maxCyclesExecuted: number, maxMemoryBytesAccessed: number): void {
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
                    errorContext = `expected ${expected} but got ${n} instead at index ${outputIndex - 1}`;
                }
            }
        },

        onHalt: () => { throw new ProgramVerificationError("Execution halted unexpectedly", { inputs, inputIndex }); },
    });

    while (correct && outputIndex < expectedOutputs.length && emulator.getCyclesExecuted() <= maxCyclesExecuted && emulator.getMemoryBytesAccessed() <= maxMemoryBytesAccessed) {
        emulator.step();
    }

    if (emulator.getCyclesExecuted() > maxCyclesExecuted || emulator.getMemoryBytesAccessed() > maxMemoryBytesAccessed) {
        throw new ProgramVerificationError(`Execution during ${context} did not complete within ${maxCyclesExecuted} cycles and ${maxMemoryBytesAccessed} bytes (acutal: ${emulator.getCyclesExecuted()} cycles, ${emulator.getMemoryBytesAccessed()} bytes)`, { inputs, inputIndex });
    }

    if (!correct) {
        throw new ProgramVerificationError(`Incorrect output produced during ${context} (${errorContext})`, { inputs, inputIndex });
    }
}

export const verificationMaxCycles = 100000;
export const solutionBytesMax = 256;

export function verifySolution(puzzle: Puzzle, bytes: number[], cyclesExecuted: number, memoryBytesAccessed: number): void {
    const { testSets } = generatePuzzleTest(puzzle);
    const program: AssembledProgram = {
        bytes,
        sourceMap: [],
        variables: [],
        breakpoints: [],
    };

    // Verify using standard input and supplied stats
    verifyProgram("standard input", testSets[0].input, testSets[0].output, program, cyclesExecuted, memoryBytesAccessed);

    // Verify subsequent tests
    for (let i = 1; i < testSets.length; i++) {
        verifyProgram(`test set ${i + 1}`, testSets[i].input, testSets[i].output, program, verificationMaxCycles, solutionBytesMax);
    }
}

// Helpers
function randomPositive() {
    return Math.floor(Math.random() * 10) + 1;
}

function randomKindOfLargePositive() {
    return Math.floor(Math.random() * 99) + 1;
}

function randomLargePositive() {
    return Math.floor(Math.random() * 101) + 1;
}

function randomNonnegative() {
    return Math.floor(Math.random() * 10);
}

function randomPositiveSequence(sequenceLength: number = 6) {
    const sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        sequence.push(randomPositive());
    }
    sequence.push(0);
    return sequence;
}

function randomSet(setSize: number = 5) {
    const pool = [];
    for (let i = 0; i < setSize * 2; i++) {
        pool.push(i + 1);
    }

    const set = [];
    for (let i = 0; i < setSize; i++) {
        const value = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        set.push(value);
    }
    set.push(0);
    return set;
}

function charactersToNumbers(characters: string): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < characters.length; i++) {
        numbers.push(characters.charCodeAt(i));
    }
    return numbers;
}

function stringToNumbers(str: string): number[] {
    const numbers = charactersToNumbers(str);
    numbers.push(0);
    return numbers;
}

function stringsToNumbers(strings: string[]): number[] {
    const numbers: number[] = [];
    for (const str of strings) {
        numbers.push(...charactersToNumbers(str));
        numbers.push(0);
    }
    return numbers;
}

export function shuffleInPlace<T>(array: T[]): void {
    for (let i = array.length - 1; i >= 1; i--) {
        const index = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[index];
        array[index] = tmp;
    }
}

export const puzzles = [
    {
        groupTitle: "Tutorial",
        list: [
            {
                title: "Subleq Instruction and Output",
                minimumSolvedToUnlock: 0,
                description: "Use subleq and input/output to negate an input and write it out.",
                code:
`; The Single Instruction Computer Mark 1 (SIC-1) is an 8-bit computer with 256 bytes of memory. Programs for the SIC-1 are written in SIC-1 Assembly Language.
;
; Each instruction is 3 bytes, specified as follows:
;
;   subleq <A> <B> [<C>]
;
; A, B, and C are memory addresses (0 - 255) or labels.
;
; \"subleq\" subtracts the value at address B from the value at address A and stores the result at address A (i.e. mem[A] ← mem[A] - mem[B]).
;
; If the result is <= 0, execution branches to address C.
;
; Note that if C is not specified, the address of the next instruction is automatically added by the assembler (in effect, this means that taking the branch is no different from advancing to the next instruction).
;
; For convenience, addresses can be specified using labels. The following predefined labels are always available:
;
;   @MAX (252): Maximum user-modifiable address
;   @IN (253): Reads a value from input (writes are ignored)
;   @OUT (254): Writes a result to output (reads as zero)
;   @HALT (255): Terminates the program when accessed
;
; Note: any text following a semicolon is considered a comment. Comments are ignored by the assembler.
; 
; Below is a very simple SIC-1 program that negates one input value and writes it out.
;
; E.g. if the input value from @IN is 3, it subtracts 3 from @OUT (which reads as zero), and the result of 0 - 3 = -3 is written out.

subleq @OUT, @IN

; Use the \"Compile/Step\" (Ctrl+.) and \"Run\" (Ctrl+Enter) buttons to execute the program until all expected outputs have been successfully written out (see the \"In\"/\"Expected\"/\"Out\" table to the left).
`
                ,
                io: [
                    [[3], [-3]]
                ]
            },
            {
                title: "Data Directive and Looping",
                minimumSolvedToUnlock: 1,
                description: "Use .data and labels to loop.",
                code:
`; Custom labels are defined by putting \"@name: \" at the beginning of a line, e.g.:
;
;   @loop: subleq 1, 2
;
; In addition to \"subleq\", there is an assembler directive \".data\" that sets a byte of memory to a value at compile time (note: this is not an instruction!):
;
;   .data <X>
;
; X is a signed byte between -128 and 127 (inclusive).
;
; Combining labels and the \".data\" directive allows you to develop a system of constants and variables. For example, here a byte is set to zero, and the label @zero points to that value:
;
;   @zero: .data 0
;
; Note that, while a program is executing, you can view the current value of each variable in the variable table on the right (under the memory table).
;
; Variables can be used for implementing an unconditional jump:
;
;   subleq @zero, @zero, @next
;
; This will set @zero to @zero - @zero (still zero) and, since the result is always <= 0, execution branches to @next.
;
; Below is an updated negation program that repeatedly negates input values and writes them out in a loop.

@loop:
subleq @OUT, @IN
subleq @zero, @zero, @loop

@zero: .data 0
`
                ,
                io: [
                    [[3], [-3]],
                    [[4], [-4]],
                    [[5], [-5]]
                ]
            },
            {
                title: "First Assessment",
                minimumSolvedToUnlock: 2,
                description: "Write input values to output.",
                test: {
                    createRandomTest: () => [1, 2, 3].map(a => [randomPositive()]),
                    getExpectedOutput: (input) => input,
                },
                code:
`; Now that you understand the \"subleq\" instruction, the \".data\" directive, and labels, you should be able to read values from input and write the exact same values out, by negating the value twice.
;
; Below is an almost complete solution. You will need to replace instances of \"???\". Hint: use a label that points to a storage location for a (negated) value.

@loop:
subleq ???, @IN
subleq @OUT, ???
subleq @tmp, @tmp, @loop  ; Reset @tmp to zero, and jump to @loop

@tmp: .data 0
`
                ,
                io: [
                    [[1], [1]],
                    [[2], [2]],
                    [[3], [3]]
                ]
            },
        ],
    },
    {
        groupTitle: "Arithmetic",
        list: [
            {
                title: "Addition",
                minimumSolvedToUnlock: 3,
                song: "light",
                description: "Read two numbers and output their sum. Repeat.",
                test: {
                    fixed: [[[99, 28], [-100, 100], [1, -2]]],
                    createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
                    getExpectedOutput: (input) => input.map(a => [a[0] + a[1]]),
                },
                code:
`; Read two numbers and output their sum. Repeat.
;
; Below is the solution to the previous task. You will need to add additional code to perform addition of two inputs (instead of passing through a single input):

@loop:
subleq @tmp, @IN
subleq @OUT, @tmp
subleq @tmp, @tmp, @loop  ; Reset @tmp to zero, and jump to @loop

@tmp: .data 0
`,
                io: [
                    [[1, 1], [2]],
                    [[1, 2], [3]],
                    [[1, -1], [0]],
                    [[11, 25], [36]],
                    [[82, 17], [99]]
                ]
            },
            {
                title: "Subtraction",
                minimumSolvedToUnlock: 3,
                song: "light",
                description: "Read two numbers (A, then B) and output A minus B. Repeat.",
                test: {
                    fixed: [[[100, 101], [111, 72], [1, -120]]],
                    createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
                    getExpectedOutput: (input) => input.map(a => [a[0] - a[1]]),
                },
                io: [
                    [[1, 1], [0]],
                    [[1, 2], [-1]],
                    [[1, -1], [2]],
                    [[11, 25], [-14]],
                    [[82, 17], [65]]
                ]
            },
            {
                title: "Sign Function",
                minimumSolvedToUnlock: 3,
                description: "Read a number. If less than zero, output -1; if equal to zero, output 0; otherwise output 1. Repeat.",
                test: {
                    fixed: [
                        [[127], [99], [-100], [1], [0], [99], [1]],
                        [[-1], [-1], [-2], [3], [0], [0]],
                        [[-1], [1], [2], [-3], [0], [0]],
                    ],
                    createRandomTest: () => [1, 2, 3, 4].map(a => [Math.floor(Math.random() * 5) - 2]),
                    getExpectedOutput: (input) => input.map(a => a.map(b => b < 0 ? -1 : (b > 0 ? 1 : 0))),
                },
                io: [
                    [[-1], [-1]],
                    [[0], [0]],
                    [[1], [1]],
                    [[7], [1]],
                    [[-29], [-1]],
                    [[99], [1]],
                    [[-99], [-1]]
                ]
            },
            {
                title: "Multiplication",
                minimumSolvedToUnlock: 3,
                description: "Read two nonnegative numbers and output the resulting (nonnegative) product. Repeat.",
                test: {
                    fixed: [[[11, 11], [2, 3, 0, 0], [11, 0]]],
                    createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
                    getExpectedOutput: (input) => input.map(a => {
                        const result: number[] = [];
                        for (let i = 0; i < a.length; i += 2) {
                            result.push(a[i] * a[i + 1]);
                        }
                        return result;
                    }),
                },
                io: [
                    [[1, 0], [0]],
                    [[0, 1], [0]],
                    [[1, 1], [1]],
                    [[2, 3], [6]],
                    [[7, 13], [91]]
                ]
            },
            {
                title: "Division",
                minimumSolvedToUnlock: 3,
                song: "major",
                description: "Read two positive numbers (A, then B), divide A by B, and output the quotient followed by the remainder. Repeat.",
                test: {
                    fixed: [[[122, 11], [16, 3], [7, 7]]],
                    createRandomTest: () => [1, 2, 3, 4].map(a => [randomPositive(), randomPositive()]),
                    getExpectedOutput: (input) => input.map(a => [Math.floor(a[0] / a[1]), a[0] % a[1]]),
                },
                io: [
                    [[1, 1], [1, 0]],
                    [[9, 3], [3, 0]],
                    [[17, 2], [8, 1]],
                    [[67, 9], [7, 4]]
                ]
            }
        ]
    },
    {
        groupTitle: "Sequences",
        list: [
            {
                title: "Sequence Sum",
                minimumSolvedToUnlock: 8,
                description: "Read a sequence of positive numbers and output their sum. Repeat. Sequences are terminated by a zero.",
                test: {
                    fixed: [[[100, 20, 7, 0]]],
                    createRandomTest: () => [1, 2, 3].map(a => randomPositiveSequence()),
                    getExpectedOutput: (input) => input.map(a => [a.reduce((sum, value) => sum + value, 0)]),
                },
                io: [
                    [[1, 1, 1, 0], [3]],
                    [[1, 2, 3, 0], [6]],
                    [[3, 5, 7, 11, 0], [26]],
                    [[53, 13, 22, 9, 0], [97]]
                ]
            },
            {
                title: "Sequence Cardinality",
                minimumSolvedToUnlock: 8,
                song: "light",
                description: "Read a sequence of positive numbers and output the count of numbers. Repeat. Sequences are terminated by a zero.",
                test: {
                    fixed: [[[100, 100, 100, 0]]],
                    createRandomTest: () => [1, 2].map(a => randomPositiveSequence(Math.floor(Math.random() * 4) + 2)),
                    getExpectedOutput: (input) => input.map(a => [a.reduce((sum) => sum + 1, -1)]),
                },
                io: [
                    [[0], [0]],
                    [[1, 0], [1]],
                    [[3, 4, 0], [2]],
                    [[9, 2, 7, 13, 26, 0], [5]],
                ]
            },
            {
                title: "Number to Sequence",
                minimumSolvedToUnlock: 8,
                song: "major",
                description: "Read a number and then output that many 1s, followed by a 0. Repeat.",
                test: {
                    fixed: [[[2], [0], [3], [0]]],
                    createRandomTest: () => [1, 2].map(a => [randomPositive()]),
                    getExpectedOutput: (input) => input.map(value => {
                        const output = [];
                        for (let i = 0; i < value[0]; i++) {
                            output.push(1);
                        }
                        output.push(0);
                        return output;
                    }),
                },
                io: [
                    [[0], [0]],
                    [[1], [1, 0]],
                    [[2], [1, 1, 0]],
                    [[5], [1, 1, 1, 1, 1, 0]],
                    [[3], [1, 1, 1, 0]],
                    [[7], [1, 1, 1, 1, 1, 1, 1, 0]]
                ]
            }
        ]
    },
    {
        groupTitle: "Advanced Techniques",
        list: [
            {
                title: "Self-Modifying Code",
                minimumSolvedToUnlock: 11,
                description: "Output the program's compiled code byte-by-byte.",
                code:
`; Label expressions can include an optional offset. For example, @loop+1 refers to the second byte of the instruction pointed to by @loop:
;
;   subleq @loop+1, @one
;
; This is useful in self-modifying code. Remember, each \"subleq\" instruction is stored as 3 consecutive addresses, ABC:
;
; mem[A] ← mem[A] - mem[B], with a branch to C if the result is less than or equal to zero.
;
; The sample program below reads its own compiled code. The third instruction is an example of self-modifying code because it actually modifies the first instruction. Specifically, it increments the first instruction's second address (@loop+1). This causes the *next* loop iteration's first instruction to read the *next* byte of memory (0, 1, 2, 3, ...).
;
; Note: When running a program, the original (unmodified) source code is always shown. If the program modifies itself, the changes are reflected in the memory table in the top right, but *not* in the source code viewer.

@loop:
subleq @tmp, 0           ; Second address (initially zero) will be incremented
subleq @OUT, @tmp        ; Output the value
subleq @loop+1, @n_one   ; Here is where the increment is performed
subleq @tmp, @tmp, @loop

@tmp: .data 0
@n_one: .data -1
`
                ,
                io: [
                    [[0], [12, 1, 3, -2, 12, 6, 1, 13, 9, 12, 12, 0]]
                ]
            },
            {
                title: "Stack Memory",
                minimumSolvedToUnlock: 12,
                description: "Read 3 values from input and then output the values in reverse order.",
                code:
`; This program implements a last-in, first-out stack by modifying the read and write addresses of the instructions that interact with the stack.
;
; The program pushes 3 (defined by @count) input values onto the stack and then pops them off (outputting them in reverse order).

; The first address of this instruction (which starts pointing to @stack) will be incremented with each write to the stack

@stack_push:
subleq @stack, @IN
subleq @count, @one, @prepare_to_pop

; Modify the instruction at @stack_push (increment target address)
subleq @stack_push, @n_one
subleq @tmp, @tmp, @stack_push

; Prepare to start popping values off of the stack by copying the current stack position to @stack_pop+1
@prepare_to_pop:
subleq @tmp, @stack_push
subleq @stack_pop+1, @tmp

; Read a value from the stack (note: the second address of this instruction is repeatedly decremented)
@stack_pop:
subleq @OUT, 0

; Decrement stack address in the instruction at @stack_pop
subleq @stack_pop+1, @one
subleq @tmp, @tmp, @stack_pop

; Constants
@one: .data 1
@n_one: .data -1

; Variables
@tmp: .data 0
@count: .data 3

; Address of @stack (defined below)
@stack_address: .data @stack

; Base of stack (stack will grow to larger addresses, so no varaibles should be placed after this one)
@stack: .data 0
`
                ,
                io: [
                    [[3, 5, 7], [7, 5, 3]]
                ]
            }
        ]
    },
    {
        groupTitle: "Sequence Manipulation",
        list: [
            {
                title: "Reverse Sequence",
                minimumSolvedToUnlock: 13,
                song: "light",
                description: "Read a sequence of positive numbers (terminated by a zero) and output the sequence in reverse order (with zero terminator). Repeat.",
                test: {
                    fixed: [[[98, 99, 100, 0]]],
                    createRandomTest: () => [1, 2].map(() => randomPositiveSequence()),
                    getExpectedOutput: input => input.map(seq => seq.slice(0, seq.length - 1).reverse().concat([0])),
                },
                io: [
                    [[1, 2, 3, 0], [3, 2, 1, 0]],
                    [[3, 2, 1, 0], [1, 2, 3, 0]],
                    [[3, 5, 7, 11, 13, 15, 17, 0], [17, 15, 13, 11, 7, 5, 3, 0]]
                ]
            },
            {
                title: "Interleave",
                minimumSolvedToUnlock: 13,
                song: "major",
                description: "Read two equal length positive sequences (A and B) and interleave their elements (A1, B1, A2, B2, ...), ending with a single zero. Repeat.",
                test: {
                    createRandomTest: () => [1, 2].map(() => randomPositiveSequence(3).concat(randomPositiveSequence(3))),
                    getExpectedOutput: input => input.map(seq => {
                        const output = [];
                        for (let i = 0; i < seq.length / 2; i++) {
                            output.push(seq[i]);
                            output.push(seq[i + seq.length / 2]);
                        }
                        output.pop();
                        return output;
                    }),
                },
                io: [
                    [[1, 1, 1, 0, 2, 2, 2, 0], [1, 2, 1, 2, 1, 2, 0]],
                    [[9, 8, 7, 0, 10, 20, 30, 0], [9, 10, 8, 20, 7, 30, 0]],
                    [[3, 5, 7, 11, 0, 13, 17, 19, 23, 0], [3, 13, 5, 17, 7, 19, 11, 23, 0]],
                ]
            },
            {
                title: "Indicator Function",
                minimumSolvedToUnlock: 13,
                description: "Read two zero-terminated sets of numbers on the interval [1, 99], A and B. For each element of B, output a 1 if the value is in A and 0 otherwise. Repeat.",
                test: {
                    fixed: [[[13, 57, 99, 63, 0, 13, 99, 57, 0], [61, 62, 63, 64, 0, 66, 64, 62, 60, 0], [97, 98, 99, 0, 77, 88, 99, 0]]],
                    createRandomTest: () => [1, 2].map(() => randomSet().concat(randomSet())),
                    getExpectedOutput: input => input.map(seqIn => {
                        const seq = seqIn.slice();
                        const a = seq.splice(0, seq.indexOf(0));
                        seq.shift();
                        const b = seq.splice(0, seq.indexOf(0));
                        return b.map(value => (a.indexOf(value) >= 0) ? 1 : 0);
                    }),
                },
                io: [
                    [[2, 4, 6, 0, 1, 2, 3, 0], [0, 1, 0]],
                    [[3, 5, 7, 0, 9, 6, 3, 0], [0, 0, 1]],
                ]
            },
            {
                title: "Sort",
                minimumSolvedToUnlock: 13,
                song: "light",
                description: "Read a list of numbers on the interval [1, 99] (terminated by a zero) and output the list ordered smallest to largest, ending with a zero. Repeat.",
                test: {
                    fixed: [[[93, 94, 95, 96, 97, 98, 99, 0]]],
                    createRandomTest: () => [1, 2].map(() => randomPositiveSequence()),
                    getExpectedOutput: input => input.map(seq => seq.slice(0, seq.length - 1).sort((a, b) => a - b).concat([0])),
                },
                io: [
                    [[3, 1, 2, 0], [1, 2, 3, 0]],
                    [[9, 9, 5, 0], [5, 9, 9, 0]],
                    [[17, 13, 19, 5, 23, 7, 0], [5, 7, 13, 17, 19, 23, 0]],
                ]
            },
            {
                title: "Mode",
                minimumSolvedToUnlock: 13,
                song: "major",
                description: "Read a list of numbers on the interval [1, 99] (terminated by a zero) and output the most common element. Repeat.",
                test: {
                    fixed: [[[96, 97, 98, 97, 96, 98, 99, 96, 98, 96, 0], [87, 49, 87, 3, 49, 49, 3, 0]]],
                    createRandomTest: () => [1, 2].map((count) => {
                        const numbers = [1, 2, 3].map(n => randomKindOfLargePositive());
                        const input = [];
                        for (let j = 0; j < 3; j++) {
                            for (let c = 0; c <= count; c++) {
                                input.push(numbers[j]);
                            }
                        }
                        input.push(numbers[Math.floor(Math.random() * numbers.length)]);
                        shuffleInPlace(input);
                        input.push(0);
                        return input;
                    }),
                    getExpectedOutput: input => input.map(seq => {
                        let counts = {};
                        for (const value of seq) {
                            if (counts[value]) {
                                counts[value]++;
                            } else {
                                counts[value] = 1;
                            }
                        }

                        let max = 0;
                        let mode = 0;
                        for (const key in counts) {
                            if (counts[key] > max) {
                                max = counts[key];
                                mode = parseInt(key);
                            }
                        }
                        return [mode];
                    }),
                },
                io: [
                    [[1, 2, 3, 3, 0], [3]],
                    [[1, 2, 1, 2, 1, 0], [1]],
                    [[3, 1, 2, 3, 1, 2, 3, 3, 1, 2, 2, 2, 0], [2]],
                ]
            },
        ]
    },
    {
        groupTitle: "Natural Language Processing",
        list: [
            {
                title: "Characters",
                minimumSolvedToUnlock: 18,
                description: "Output the following two characters: \"Hi\"",
                code:
`; When configured properly, the SIC-1 supports natural human language input and output using a highly modern (c. 1967) mapping from numbers to characters known as ASCII. For example, 72 is mapped to "H" (capital "h").
;
; To capture the characters "Hi" (capital "h", lower case "i") in two variables, one could consult an ASCII lookup table and write:
;
;   @H: .data 72
;   @i: .data 105
;
; Consulting an ASCII table is tedious, so to make SIC Systems engineers' lives easier, SIC-1 Assembly Language now supports automated ASCII lookup using the following advanced syntax (which is equivalent to explicitly specifying characters' mapped numbers):
;
;   @H: .data 'H' ; 72
;   @i: .data 'i' ; 105
;
; As a final convenience, it is possible to negate the value of a character by prefixing the character literal with a minus:
;
;   @n_H: .data -'H' ; -72
;
; The following sample program outputs the characters "Hi":

subleq @OUT, @n_H ; Note: (0 - (-72) = 72 = 'H')
subleq @OUT, @n_i

@n_H: .data -'H'
@n_i: .data -'i'
`
                ,
                outputFormat: Format.characters,
                io: [
                    [[0], charactersToNumbers("Hi")],
                ]
            },
            {
                title: "Decimal Digits",
                minimumSolvedToUnlock: 19,
                description: "Read a decimal digit character, output the numeric value. Repeat.",
                test: {
                    fixed: [[charactersToNumbers("0"), charactersToNumbers("9")]],
                    createRandomTest: () => [1, 2, 3, 4, 5, 6].map(n => charactersToNumbers(Math.floor(Math.random() * 10).toString())),
                    getExpectedOutput: input => input.map(seq => [parseInt(String.fromCharCode(seq[0]))]),
                },
                code:
`; For this assignment, map each decimal digit character (e.g. '1') to the numeric value it represents (e.g. '1' -> 1). Inputs will be characters, but outputs are expected to be numbers.
;
; Keep in mind that the character '1' is not the same as the number 1. The ASCII mapping for '1' is actually 49.
;
; Also note that the ASCII mappings for '0', '1', '2', etc. are contiguous:
;
; '0' = 48
; '1' = 49
; '2' = 50
; etc.

`
                ,
                inputFormat: Format.characters,
                io: [
                    [charactersToNumbers("1"), [1]],
                    [charactersToNumbers("2"), [2]],
                    [charactersToNumbers("7"), [7]],
                ]
            },
            {
                title: "Uppercase",
                minimumSolvedToUnlock: 19,
                song: "light",
                description: "Read and output characters, converting all lowercase characters to uppercase.",
                test: {
                    fixed: [[["a".charCodeAt(0)], ["z".charCodeAt(0)], ["a".charCodeAt(0) - 1], ["z".charCodeAt(0) + 1]]],
                    createRandomTest: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => [Math.floor(Math.random() * 75) + 48]),
                    getExpectedOutput: input => input.map(seq => [String.fromCharCode(seq[0]).toUpperCase().charCodeAt(0)]),
                },
                code:
`; Read and output characters. For each alphabetic character, convert it to uppercase if needed.
;
; Note that the mappings for 'a', 'b', ... 'z' are contiguous, as are 'A', 'B', ... 'Z'.

`
                ,
                inputFormat: Format.characters,
                outputFormat: Format.characters,
                io: [
                    [charactersToNumbers("U"), charactersToNumbers("U")],
                    [charactersToNumbers("r"), charactersToNumbers("R")],
                    [charactersToNumbers("g"), charactersToNumbers("G")],
                    [charactersToNumbers("e"), charactersToNumbers("E")],
                    [charactersToNumbers("n"), charactersToNumbers("N")],
                    [charactersToNumbers("t"), charactersToNumbers("T")],
                    [charactersToNumbers("!"), charactersToNumbers("!")],
                ]
            },
            {
                title: "Strings",
                minimumSolvedToUnlock: 21,
                song: "major",
                description: `Output the string "Hello, world!".`,
                code:
`; Strings are sequences of characters that are terminated with a zero. In the following example, @string points to a 3 byte sequence representing the string "Hi":
;
;   @string:
;   .data 'H'
;   .data 'i'
;   .data 0
;
; Although not discussed previously, the .data directive can actually take a sequence of values to set multiple bytes, so the previous code could be simplified:
;
;   @string: .data 'H', 'i', 0
;
; And thanks to the innovative design-by-committee approach employed by SIC Systems, the following novel syntax for strings can be used (again, equivalent to the other examples):
;
;   @string: .data "Hi" ; Sets the next 3 bytes: 'H', 'i', 0
;
; Similar to character values, an entire string can be negated by prefixing it with a minus:
;
;   @n_string: .data -"Hi" ; Sets the next 3 bytes: -72, -105, 0
;
; The following code outputs "Hello, world!":

@loop:
subleq @OUT, @n_message  ; Read address starts at @n_message
subleq @loop+1, @n_one   ; Advance read address
subleq @tmp, @tmp, @loop

@n_one: .data -1
@n_message: .data -"Hello, world!"
@tmp: .data 0
`
                ,
                outputFormat: Format.strings,
                io: [
                    [[0], stringToNumbers("Hello, world!")],
                ]
            },
            {
                title: "Tokenizer",
                minimumSolvedToUnlock: 22,
                description: "Read a string and output each word as its own string. Repeat.",
                test: {
                    fixed: [[stringToNumbers("subleq @OUT @IN"), stringToNumbers(".data 0")]],
                    createRandomTest: () => [stringToNumbers([1, 2, 3].map(n => String.fromCharCode(...[1, 2, 3].map(n2 => Math.floor(Math.random() * 75) + 48))).join(" "))],
                    getExpectedOutput: input => input.map(seq => stringsToNumbers(String.fromCharCode(...seq.slice(0, seq.length - 1)).split(" "))),
                },
                code:
`; Read a string and output each word as its own string. Repeat.
;
; Note: words are each separated by a single space (and the last word ends with a zero).

`
                ,
                inputFormat: Format.strings,
                outputFormat: Format.strings,
                io: [
                    [stringToNumbers("The quick brown fox loves SIC Systems"), stringsToNumbers(["The", "quick", "brown", "fox", "loves", "SIC", "Systems"])],
                ]
            },
            {
                title: "Parse Decimal",
                minimumSolvedToUnlock: 22,
                song: "light",
                description: "Read a string representing a number on the interval [1, 127] and output the corresponding value. Repeat.",
                test: {
                    fixed: [[stringToNumbers("123"), stringToNumbers("9")]],
                    createRandomTest: () => [1, 2, 3].map(n => stringToNumbers(randomLargePositive().toString())),
                    getExpectedOutput: input => input.map(seq => [parseInt(String.fromCharCode(...seq.slice(0, seq.length - 1)))]),
                },
                inputFormat: Format.strings,
                io: [
                    [stringToNumbers("1"), [1]],
                    [stringToNumbers("20"), [20]],
                    [stringToNumbers("74"), [74]],
                ]
            },
            {
                title: "Print Decimal",
                minimumSolvedToUnlock: 22,
                description: "Read a positive number on the interval [1, 127] and output a string representing the number in decimal form. Repeat.",
                test: {
                    fixed: [[[123], [9], [100], [101], [12]]],
                    createRandomTest: () => [1, 2, 3].map(n => [randomLargePositive()]),
                    getExpectedOutput: input => input.map(seq => stringToNumbers(seq[0].toString())),
                },
                outputFormat: Format.strings,
                io: [
                    [[1], stringToNumbers("1")],
                    [[20], stringToNumbers("20")],
                    [[74], stringToNumbers("74")],
                ]
            },
            {
                title: "Calculator",
                minimumSolvedToUnlock: 22,
                song: "major",
                description: "Read a string representing arithmetic (+, -, or *) on 2 numbers on the interval [1, 127]; write out the resulting value. Repeat.",
                test: {
                    fixed: [[stringToNumbers("10 * 11"), stringToNumbers("120 - 61"), stringToNumbers("61 + 62"), stringToNumbers("8 * 1")]],
                    createRandomTest: () => [1, 2, 3, 4].map(n => {
                        const operations = ["+", "-", "*"];
                        const operation = operations[Math.floor(Math.random() * operations.length)];
                        let a: number;
                        let b: number;
                        switch (operation) {
                            case "+":
                                a = randomLargePositive();
                                b = Math.floor(Math.random() * (120 - a)) + 1;
                                break;

                            case "-":
                                a = randomLargePositive();
                                b = randomLargePositive();
                                break;

                            case "*":
                                a = Math.floor(Math.random() * 11) + 1;
                                b = Math.floor(Math.random() * 11) + 1;
                                break;
                        }

                        return stringToNumbers(`${a} ${operation} ${b}`);
                    }),
                    getExpectedOutput: input => input.map(seq => {
                        const parts = String.fromCharCode(...seq.slice(0, seq.length - 1)).split(" ");
                        const a = parseInt(parts[0]);
                        const b = parseInt(parts[2]);
                        switch (parts[1]) {
                            case "+": return [a + b];
                            case "-": return [a - b];
                            case "*": return [a * b];
                        }
                    }),
                },
                inputFormat: Format.strings,
                io: [
                    [stringToNumbers("1 + 1"), [2]],
                    [stringToNumbers("99 - 100"), [-1]],
                    [stringToNumbers("10 * 4"), [40]],
                ]
            },
        ]
    },
    {
        groupTitle: "Self-Hosting",
        list: [
            {
                title: "Multi-Line Strings",
                minimumSolvedToUnlock: 26,
                description: "Read a string with multiple lines and write out each line as a string.",
                code:
`; New line characters (value 10) can be expressed with the character '\\n'. They can also be used in strings, for example: "Line 1\\nLine 2".
;
; Read a string with multiple lines and write out each line as a string.

`
                ,
                inputFormat: Format.strings,
                outputFormat: Format.strings,
                io: [
                    [stringToNumbers(".data 1\n.data 2\n.data 3\n"), stringsToNumbers([".data 1", ".data 2", ".data 3"])],
                ]
            },
            {
                title: "Parse Data Directives",
                minimumSolvedToUnlock: 27,
                song: "light",
                description: "Parse a program with multiple .data directives and output the corresponding values.",
                test: {
                    fixed: [[stringToNumbers(".data 0\n.data -128\n.data 127\n")]],
                    createRandomTest: () => [stringToNumbers([1, 2, 3, 4].map(n => `.data ${Math.floor(Math.random() * 256) - 128}`).join("\n") + "\n")],
                    getExpectedOutput: input => input.map(seq => String.fromCharCode(...seq.slice(0, seq.length - 1))
                        .replace(/[.]data/g, "")
                        .split("\n")
                        .map(s => s.trim())
                        .filter(s => s.length > 0)
                        .map(s => parseInt(s))),
                },
                code:
`; Parse a program with multiple .data directives and output the corresponding values.
;
; Each .data directive only has a single value on the range [-128, 127] (inclusive).

`
                ,
                inputFormat: Format.strings,
                io: [
                    [stringToNumbers(".data 5\n.data -7\n.data 11\n"), [5, -7, 11]],
                ]
            },
            {
                title: "Parse Subleq Instructions",
                minimumSolvedToUnlock: 28,
                description: "Parse a program with multiple subleq instructions and output the compiled program.",
                test: {
                    fixed: [[stringToNumbers("subleq 7 253 255\nsubleq 7 7 0\n")]],
                    createRandomTest: () => [stringToNumbers([1, 2, 3].map(n => `subleq ${[1, 2, 3].map(x => Math.floor(Math.random() * 256).toString()).join(" ")}`).join("\n") + "\n")],
                    getExpectedOutput: input => input.map(seq => String.fromCharCode(...seq.slice(0, seq.length - 1))
                        .replace(/subleq/g, "")
                        .split(/[ \n]/)
                        .map(s => s.trim())
                        .filter(s => s.length > 0)
                        .map(s => Assembler.unsignedToSigned(parseInt(s)))),
                },
                code:
`; Parse a program with multiple subleq instructions and output the compiled program.
;
; Each subleq instruction specifies 3 addresses, separated by spaces (' '). The addresses are on the range [0, 255] (inclusive).
;
; Note that the unsigned (nonnegative) addresses will be written out as signed values on the range [-128, 127] (also inclusive). For example, 255 becomes -1, 254 becomes -2, ..., 128 becomes -128, but 127 and below are unchanged.

`
                ,
                inputFormat: Format.strings,
                io: [
                    [stringToNumbers("subleq 9 253 3\nsubleq 254 9 6\nsubleq 9 9 0\n"), [9, -3, 3, -2, 9, 6, 9, 9, 0]],
                ]
            },
            {
                title: "Self-Hosting",
                minimumSolvedToUnlock: 29,
                song: "major",
                description: "Read in a SIC-1 program and execute it until it branches to address 255, writing out any values written to address 254. Repeat.",
                test: {
                    fixed: [
                        [stringToNumbers(
`subleq 18 17 3
subleq 17 18 6
subleq 254 17 9
subleq 16 15 255
subleq 18 18 0
.data 1
.data 5
.data -1
.data 0
`
                        )],
                    ],
                    createRandomTest: () => [
                        (() => {
                            const primes = [1, -3, 5, -7, 11, -13, 17, -19];
                            const x = primes[Math.floor(Math.random() * primes.length)];
                            const y = primes[Math.floor(Math.random() * primes.length)];
                            const addresses = [16, 17];
                            const a1 = addresses[Math.floor(Math.random() * addresses.length)];
                            const a2 = addresses[Math.floor(Math.random() * addresses.length)];
                            const a3 = addresses[Math.floor(Math.random() * addresses.length)];
                            return stringToNumbers(
`subleq 15 ${a1} ${((Math.random() * 2) >= 1) ? 9 : 3}
subleq 15 ${a2} ${((Math.random() * 2) >= 1) ? 9 : 6}
subleq 15 ${a3} 9
subleq 254 15 12
subleq 15 15 255
.data ${x}
.data ${y}
.data 0
`
                            );
                        })(),
                        stringToNumbers(
`subleq 18 17 3
subleq 17 18 6
subleq 254 17 9
subleq 16 15 255
subleq 18 18 0
.data 1
.data 5
.data -${Math.floor(Math.random() * 3) + 1}
.data 0
`
                            ),
                    ],
                    getExpectedOutput: input => input.map(seq => {
                        const input = String.fromCharCode(...seq.slice(0, seq.length - 1)).split("\n");
                        const result = [];
                        const emulator = new Emulator(Assembler.assemble(input), {
                            writeOutput: n => {
                                result.push(n);
                            },
                        });

                        let step = 0;
                        while (step++ < 50 && emulator.isRunning()) {
                            emulator.step();
                        }

                        return result;
                    }),
                },
                code:
`; Parse a program containing .data directives and subleq instructions, then execute that program.
;
; All addresses used by the input program should be isolated from your program's address space.
;
; As in any other program, if the program writes to address 254 (@OUT; signed value: -2), that value should be directly written out.
;
; If the program branches to address 255 (@HALT; signed value: -1), then the program is done. Start over from scratch with the next input program.
;
; The compiled size of each input program is <= 21 bytes.
;
; As in previous tasks, the .data directive will always have exactly 1 value and subleq instructions will specify exactly 3 addresses (separated by spaces only).
;
; Additionally, the input programs will not use self-modifying code or declare/use any labels or variables. The only built-in addresses that will be used will be referenced by address instead of label (e.g. "254" will be used but "@OUT" will not).

`
                ,
                inputFormat: Format.strings,
                io: [
                    // subleq @b @a
                    // subleq @b @a
                    // subleq @OUT @b @HALT

                    // @a: .data -9
                    // @b: .data 0

                    [stringToNumbers("subleq 10 9 3\nsubleq 10 9 6\nsubleq 254 10 255\n\n.data -9\n.data 0\n"), [-18]],
                ]
            },
            {
                title: "Self-Hosting Part 2",
                minimumSolvedToUnlock: 30,
                song: "menu",
                description: "Read in a self-modifying SIC-1 program and execute it until it branches to address 255, writing out any values written to address 254. Repeat.",
                code:
`; Parse a self-modifying program containing .data directives and subleq instructions, then execute that program.
;
; Writes to address @OUT should be directly written out. If the program branches to address @HALT, then the program is done. Start over from scratch with the next input program.
;
; The compiled size of each input program is <= 21 bytes.
;
; As in previous tasks, the .data directive will always have exactly 1 value and subleq instructions will specify exactly 3 addresses (separated by spaces only) and no labels will be used.

`
                ,
                test: {
                    // Derived from a minimal reflector:
                    //
                    // @read:
                    // subleq @l3+2 0 3
                    // subleq @OUT @l3+2 6
                    // @l3: subleq @read+1, @l4+2 0
                    // @l4: subleq @counter 0 @HALT ; Replace that second address to change increment
                    // subleq @l3+2 @l3+2 @read
                    // @counter: .data 15
                    fixed: [[
                        ...[0, 2, 5].map(address => stringToNumbers(`subleq 8 0 3\nsubleq 254 8 6\nsubleq 1 11 0\nsubleq 15 ${address} 255\nsubleq 8 8 0\n.data 15\n`)),

                        // Output every other byte
                        stringToNumbers("subleq 254 0 3\nsubleq 1 12 6\nsubleq 14 12 0\nsubleq 15 15 255\n.data -2\n.data 1\n.data -11\n.data 0\n"),
                    ]],

                    createRandomTest: () => {
                        const result: number[][] = [];

                        for (let i = 0; i < 2; i++) {
                            // Derived from code that patches reading one byte:
                            //
                            //@l1: subleq @l2 @a
                            // @l2: subleq @l3+6 @b
                            // @l3: subleq @OUT-4 @l1+1 ; This address changes
                            // subleq @z @z @HALT
                            // @a: .data 6
                            // @b: .data -4
                            // @z: .data 0

                            const a = Math.floor(Math.random() * 5) + 1;
                            const b = Math.floor(Math.random() * 5) + 1;
                            result.push(stringToNumbers(
`subleq 3 12 3
subleq ${6+a} 13 6
subleq ${254-b} ${Math.floor(Math.random() * 10)} 9
subleq 14 14 255
.data ${a}
.data -${b}
.data 0
`
                            ));
                        }

                        // Derived from code that patches two instructions:
                        //
                        // @unmask:
                        // subleq @masked, @mask
                        // subleq @unmask, @n_1
                        // subleq @counter, @n_1, @unmask
                        // @masked: ; subleq @OUT, @o
                        // .data 53
                        // .data 70
                        // .data 67
                        // .data 70 ; subleq @o, @o, @HALT
                        // .data 70
                        // .data 54
                        // .data 21 ; @o: .data ...
                        // @mask: .data 55
                        // @counter: .data -6
                        // @n_1: .data -1
                        const mask = Math.floor(Math.random() * 30) + 20;
                        const output = Math.floor(Math.random() * 30) + 20;

                        result.push(stringToNumbers(
`subleq 9 16 3
subleq 0 18 6
subleq 17 18 0
.data ${Assembler.unsignedToSigned(254 + mask)}
.data ${15 + mask}
.data ${12 + mask}
.data ${15 + mask}
.data ${15 + mask}
.data ${Assembler.unsignedToSigned(255 + mask)}
.data ${output + mask}
.data ${mask}
.data -6
.data -1
`
                        ));

                        return result;
                    },

                    getExpectedOutput: input => input.map(seq => {
                        const input = String.fromCharCode(...seq.slice(0, seq.length - 1)).split("\n");
                        const result = [];
                        const emulator = new Emulator(Assembler.assemble(input), {
                            writeOutput: n => {
                                result.push(n);
                            },
                        });

                        let step = 0;
                        while (step++ < 50 && emulator.isRunning()) {
                            emulator.step();
                        }

                        return result;
                    }),
                },
                inputFormat: Format.strings,
                io: [
                    [stringToNumbers(
// ; Outputs its own first 12 bytes of code (negated)
//
// @start:
// subleq @OUT @start
// subleq @start+1 @n_1
// subleq @count @n_1 @start
// subleq @zero @zero @HALT

// @n_1: .data -1
// .data 1
// @count: .data -11
// @zero: .data 0

`subleq 254 0 3
subleq 1 12 6
subleq 14 12 0
subleq 15 15 255
.data -1
.data 1
.data -11
.data 0
`
                        ),
                        [2, -1, -3, -1, -12, -6, -14, -12, 0, -15, -15, 1],
                    ],
                ],
            },
        ]
    },
] as const;

export const puzzleFlatArray: Puzzle[] = [].concat(...puzzles.map(p => p.list));
export const puzzleCount = puzzleFlatArray.length;
