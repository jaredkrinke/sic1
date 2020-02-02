import { Puzzle } from "./puzzle";

export interface PuzzleGroup {
    groupTitle: string;
    list: Puzzle[];
}

function randomPositive() {
    return Math.floor(Math.random() * 10) + 1;
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

export const puzzles: PuzzleGroup[] = [
    {
        groupTitle: "Tutorial",
        list: [
            {
                title: "Subleq Instruction and Output",
                minimumSolvedToUnlock: 0,
                description: "Use subleq and input/output to negate an input and write it out.",
                code:
`; The SIC-1 is an 8-bit computer with 256 bytes of memory.
; Programs are written in SIC-1 Assembly Language.
; Each instruction is 3 bytes, specified as follows:
;
;   subleq <A> <B> [<C>]
;
; A, B, and C are memory addresses (0 - 255) or labels.
;
; \"subleq\" subtracts the value at address B from the
; value at address A and stores the result at address A
; (i.e. mem[A] = mem[A] - mem[B]).
;
; If the result is <= 0, execution branches to address C.
;
; Note that if C is not specified, the address of the next
; instruction is used (in other words, the branch does
; nothing).
;
; For convenience, addresses can be specified using labels.
; The following predefined labels are always available:
;
;   @MAX (252): Maximum user-modifiable address
;   @IN (253): Reads a value from input (writes are ignored)
;   @OUT (254): Writes a result to output (reads as zero)
;   @HALT (255): Terminates the program when executed
;
; Below is a very simple SIC-1 program that negates one input
; value and writes it out.
;
; E.g. if the input value from @IN is 3, it subtracts 3 from
; @OUT (which reads as zero), and the result of 0 - 3 = -3 is
; written out.

subleq @OUT, @IN

; Use the \"Step\" and \"Run\" buttons to execute the program
; until all expected outputs have been successfully written
; out (see the \"In\"/\"Expected\"/\"Out\" table to the left).
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
`; Custom labels are defined by putting \"@name: \" at the
; beginning of a line, e.g.:
;
;   @loop: subleq 1, 2
;
; In addition to \"subleq\", there is an assembler
; directive \".data\" that sets a byte of memory to a value
; at compile time (note: this is not an instruction!):
;
;   .data <X>
;
; X is a signed byte (-128 to 127).
;
; Combining labels and the \".data\" directive allows you to:
; develop of system of constants and variables:
;
;   @zero: .data 0
;
; Note that, while a program is executing, you can view the
; current value of each varaible in the variable table on
; the right (under the memory table).
;
; Variables can be used for implementing an unconditional
; jump:
;
;   subleq @zero, @zero, @loop
;
; This will set @zero to @zero - @zero (still zero) and,
; since the result is always <= 0, execution branches to
; @loop.
;
; Below is an updated negation program that repeatedly
; negates input values and writes them out.

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
`; Now that you understand the \"subleq\" instruction, the
; \".data\" directive, and labels, you should be able to read
; values from input and write the exact same values out
; (hint: negate the value twice).
;
; For reference, here is the previous program that negates
; values on their way to output:

@loop:
subleq @OUT, @IN
subleq @zero, @zero, @loop

@zero: .data 0
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
                description: "Read two numbers and output their sum. Repeat.",
                test: {
                    fixed: [[99, 28], [-100, 100], [1, -2]],
                    createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
                    getExpectedOutput: (input) => input.map(a => [a[0] + a[1]]),
                },
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
                description: "Read two numbers (A, then B) and output A minus B. Repeat.",
                test: {
                    fixed: [[100, 101], [111, 72], [1, -120]],
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
                    fixed: [[127], [99], [-100]],
                    createRandomTest: () => [1, 2, 3, 4].map(a => [Math.floor(Math.random() * 5) - 2]),
                    getExpectedOutput: (input) => input.map(a => [a[0] < 0 ? -1 : (a[0] > 0 ? 1 : 0)]),
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
                description: "Read two nonnegative numbers and output their product. Repeat.",
                test: {
                    fixed: [[11, 11], [0, 0], [11, 0]],
                    createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
                    getExpectedOutput: (input) => input.map(a => [a[0] * a[1]]),
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
                description: "Read two positive numbers (A, then B), divide A by B, and output the quotient followed by the remainder. Repeat.",
                test: {
                    fixed: [[122, 11], [16, 3], [7, 7]],
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
                    fixed: [[100, 20, 7, 0], [-50, 50, -4, 4, 0]],
                    createRandomTest: () => [1, 2].map(a => randomPositiveSequence()),
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
                description: "Read a sequence of positive numbers and output the count of numbers. Repeat. Sequences are terminated by a zero.",
                test: {
                    fixed: [[100, 100, 100, 0]],
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
                description: "Read a number and then output that many 1s, followed by a 0. Repeat.",
                test: {
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
`; Label expressions can include an optional offset, for
; example:
;
;   subleq @loop+1, @one
;
; This is useful in self-modifying code. Each \"subleq\"
; instruction is stored as 3 consecutive addresses: ABC
; (for mem[A] = mem[A] - mem[B], with potential branch
; to C).
;
; The sample program below reads its own compiled code
; and outputs it by incrementing the second address of
; the instruction at @loop (i.e. modifying address
; @loop+1).

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
`; This program implements a first-in, first-out stack by
; modifying the read and write addresses of the
; instructions that interact with the stack.
;
; The program pushes 3 (defined by @count) input
; values onto the stack and then pops them off
; (outputting them in reverse order).

; The first address of this instruction (which starts
; pointing to @stack) will be incremented with each
; write to the stack
@stack_push:
subleq @stack, @IN
subleq @count, @one, @prepare_to_pop

; Modify the instruction at @stack_push (increment
; target address)
subleq @stack_push, @n_one
subleq @tmp, @tmp, @stack_push

; Prepare to start popping values off of the stack by
; copying the current stack position to @stack_pop+1
@prepare_to_pop:
subleq @tmp, @stack_push
subleq @stack_pop+1, @tmp

; Read a value from the stack (note: the second address
; of this instruction is repeatedly decremented)
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

; Base of stack (stack will grow upwards)
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
                description: "Read a sequence of positive numbers (terminated by a zero) and output the sequence in reverse order (with zero terminator). Repeat.",
                test: {
                    fixed: [[98, 99, 100, 0]],
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
                description: "Read two equal length sequences (A and B) and interleave their elements (A1, B1, A2, B2, ...), ending with a single zero. Repeat.",
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
                title: "Sort",
                minimumSolvedToUnlock: 13,
                description: "Read a set of positive numbers (terminated by a zero) and output the set ordered smallest to largest, ending with a zero. Repeat.",
                test: {
                    fixed: [[99, 100, 101, 102, 103, 104, 105, 0]],
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
                description: "Read a set of positive numbers (terminated by a zero) and output the most common element. Repeat.",
                test: {
                    fixed: [[100, 101, 102, 101, 100, 102, 103, 100, 102, 100, 0]],
                    createRandomTest: () => [1, 2].map((count) => {
                        const input = [];
                        for (let j = 1; j <= 3; j++) {
                            for (let c = 0; c <= count; c++) {
                                input.push(j);
                            }
                        }
                        input.push(Math.floor(Math.random() * 3) + 1);
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
    }
];
