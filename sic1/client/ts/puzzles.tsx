import React from "react";
import { Puzzle, titleToPuzzle } from "../../shared/puzzles";
import { IntlShape } from "react-intl";

export enum Format {
    numbers, // Default
    characters,
    strings,
}

// Note: Values are from music.ts
const Songs = {
    light: "light",
    major: "major",
    boss: "menu",
} as const;

type ClientPuzzleStatic = Puzzle & {
    title: string;
    displayTitle: string;
    minimumSolvedToUnlock: number;
    song?: string;
    description: string;
    code?: string;
    inputFormat?: Format;
    outputFormat?: Format;

    puzzleViewOverride?: React.ReactNode;
    hint: React.ReactNode;
}

type ClientPuzzleConfigurable = Omit<ClientPuzzleStatic, "io"> & {
    customInput: true;
};

export type ClientPuzzle = ClientPuzzleStatic | ClientPuzzleConfigurable;

export const puzzleSandbox: ClientPuzzle = {
    title: "Sandbox Mode",
    displayTitle: "Sandbox Mode",
    description: "An open-ended, configurable program for exploration purposes.",
    hint: <p>Click "Configure Input" to supply custom input.</p>,
    minimumSolvedToUnlock: 4,
    customInput: true,

    puzzleViewOverride: <>
        <p>Use Sandbox Mode to freely experiment with the SIC-1 without worrying about output getting flagged as incorrect.</p>
        <p>It's possible to specify custom input using the "Configure Input" button on the left side of the main SIC-1 Development Environment (above the IO table).
            Input uses the same syntax as in a <code>.data</code> directive (examples: <code>-7</code>, <code>'A'</code>, <code>-"Negated string"</code>).</p>
    </>,

    code:
`; This is an open-ended program that allows specifying arbitrary input to help employees explore how the SIC-1 operates.
;
; Use the "Configure Input" button to the left (above the IO table) to provide custom input to the program.`,
};

export function hasCustomInput(puzzle: ClientPuzzle): puzzle is ClientPuzzleConfigurable {
    return !!puzzle["customInput"];
}

export interface ClientPuzzleGroup {
    groupTitle: string;
    list: ClientPuzzle[];
}

/** Puzzles by group */
export interface ClientPuzzleInfo {
    clientPuzzlesGrouped: ClientPuzzleGroup[];
    puzzleFlatArray: ClientPuzzle[];
    clientPuzzles: ClientPuzzle[]; // Includes the not-actually-a-puzzle "Sandbox Mode" puzzle
}

export function initializePuzzles(intl: IntlShape): ClientPuzzleInfo {
    const clientPuzzlesGrouped = [
        {
            groupTitle: intl.formatMessage({
                id: "puzzleGroupTitleTutorial",
                description: "Title of 'Tutorial' puzzle group",
                defaultMessage: "Tutorial",
            }),
            list: [
                {
                    ...titleToPuzzle["Subleq Instruction and Output"],
                    title: "Subleq Instruction and Output",
                    minimumSolvedToUnlock: 0,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSubleq Instruction and Output",
                        description: "Title of the 'Subleq Instruction and Output' puzzle",
                        defaultMessage: "Subleq Instruction and Output",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSubleq Instruction and Output",
                        description: "Description of the 'Subleq Instruction and Output' puzzle",
                        defaultMessage: "Use subleq and input/output to negate an input and write it out.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSubleq Instruction and Output",
                        description: "Hint for the 'Subleq Instruction and Output' puzzle",
                        defaultMessage: "<p>This task has already been solved. Just click <strong>Run</strong>.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeSubleq Instruction and Output",
                        description: "Initial code for the 'Subleq Instruction and Output' puzzle",
                        defaultMessage:
`; The Single Instruction Computer Mark 1 (SIC-1) is an 8-bit computer with 256 bytes of memory. Programs for the SIC-1 are written in SIC-1 Assembly Language.
;
; Each instruction is 3 bytes, specified as follows:
;
;   subleq A B [C]
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
    `,
                    }),
                },
                {
                    ...titleToPuzzle["Data Directive and Looping"],
                    title: "Data Directive and Looping",
                    minimumSolvedToUnlock: 1,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleData Directive and Looping",
                        description: "Title of the 'Data Directive and Looping' puzzle",
                        defaultMessage: "Data Directive and Looping",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionData Directive and Looping",
                        description: "Description of the 'Data Directive and Looping' puzzle",
                        defaultMessage: "Use .data and labels to loop.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintData Directive and Looping",
                        description: "Hint for the 'Data Directive and Looping' puzzle",
                        defaultMessage: "<p>This task has already been solved. Just click <strong>Run</strong>.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeData Directive and Looping",
                        description: "Initial code for the 'Data Directive and Looping' puzzle",
                        defaultMessage:
`; Custom labels are defined by putting \"@name: \" at the beginning of a line, e.g.:
;
;   @loop: subleq 1, 2
;
; In addition to \"subleq\", there is an assembler directive \".data\" that sets a byte of memory to a value at compile time (note: this is not an instruction!):
;
;   .data X
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
                    }),
                },
                {
                    ...titleToPuzzle["First Assessment"],
                    title: "First Assessment",
                    minimumSolvedToUnlock: 2,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleFirst Assessment",
                        description: "Title of the 'First Assessment' puzzle",
                        defaultMessage: "First Assessment",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionFirst Assessment",
                        description: "Description of the 'First Assessment' puzzle",
                        defaultMessage: "Write input values to output.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintFirst Assessment",
                        description: "Hint for the 'First Assessment' puzzle",
                        defaultMessage: "<p>Negate the value twice (these operations cancel out and result in the original number). This can be done by storing the negated value in a memory location that starts out as zero (e.g. <code>@tmp</code>).</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeFirst Assessment",
                        description: "Initial code for the 'First Assessment' puzzle",
                        defaultMessage:
`; Now that you understand the \"subleq\" instruction, the \".data\" directive, and labels, you should be able to read values from input and write the exact same values out, by negating the value twice.
;
; Below is an almost complete solution. You will need to replace instances of \"???\". Hint: use a label that points to a storage location for a (negated) value.

@loop:
subleq ???, @IN
subleq @OUT, ???
subleq @tmp, @tmp, @loop  ; Reset @tmp to zero, and jump to @loop

@tmp: .data 0
`
                    }),
                },
            ],
        },
        {
            groupTitle: "Arithmetic",
            list: [
                {
                    ...titleToPuzzle["Addition"],
                    title: "Addition",
                    minimumSolvedToUnlock: 3,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleAddition",
                        description: "Title of the 'Addition' puzzle",
                        defaultMessage: "Addition",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionAddition",
                        description: "Description of the 'Addition' puzzle",
                        defaultMessage: "Read two numbers and output their sum. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintAddition",
                        description: "Hint for the 'Addition' puzzle",
                        defaultMessage: "<p>Subtract two inputs into <code>@tmp</code>.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeAddition",
                        description: "Initial code for the 'Addition' puzzle",
                        defaultMessage:
`; Read two numbers and output their sum. Repeat.
;
; Below is the solution to the previous task. You will need to add additional code to perform addition of two inputs (instead of passing through a single input):

@loop:
subleq @tmp, @IN
subleq @OUT, @tmp
subleq @tmp, @tmp, @loop  ; Reset @tmp to zero, and jump to @loop

@tmp: .data 0
`
                    }),
                },
                {
                    ...titleToPuzzle["Subtraction"],
                    title: "Subtraction",
                    minimumSolvedToUnlock: 3,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSubtraction",
                        description: "Title of the 'Subtraction' puzzle",
                        defaultMessage: "Subtraction",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSubtraction",
                        description: "Description of the 'Subtraction' puzzle",
                        defaultMessage: "Read two numbers (A, then B) and output A minus B. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSubtraction",
                        description: "Hint for the 'Subtraction' puzzle",
                        defaultMessage: "<p>Use two variables.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Sign Function"],
                    title: "Sign Function",
                    minimumSolvedToUnlock: 3,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSign Function",
                        description: "Title of the 'Sign Function' puzzle",
                        defaultMessage: "Sign Function",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSign Function",
                        description: "Description of the 'Sign Function' puzzle",
                        defaultMessage: "Read a number. If less than zero, output -1; if equal to zero, output 0; otherwise output 1. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSign Function",
                        description: "Hint for the 'Sign Function' puzzle",
                        defaultMessage: "<p>Use the \"branch if result is <= 0\" property of subleq to branch between code blocks, then use (negated) constants to write the appropriate output.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Multiplication"],
                    title: "Multiplication",
                    minimumSolvedToUnlock: 3,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleMultiplication",
                        description: "Title of the 'Multiplication' puzzle",
                        defaultMessage: "Multiplication",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionMultiplication",
                        description: "Description of the 'Multiplication' puzzle",
                        defaultMessage: "Read two nonnegative numbers and output the resulting (nonnegative) product. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintMultiplication",
                        description: "Hint for the 'Multiplication' puzzle",
                        defaultMessage: "<p>Repeatedly subtract one of the numbers, using a counter to ensure the subtraction is done the appropriate number of times.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Division"],
                    title: "Division",
                    minimumSolvedToUnlock: 3,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleDivision",
                        description: "Title of the 'Division' puzzle",
                        defaultMessage: "Division",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionDivision",
                        description: "Description of the 'Division' puzzle",
                        defaultMessage: "Read two positive numbers (A, then B), divide A by B, and output the quotient followed by the remainder. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintDivision",
                        description: "Hint for the 'Division' puzzle",
                        defaultMessage: "<p>Repeatedly subtract the divisor from the dividend.</p>",
                    }),
                },
            ],
        },
        {
            groupTitle: "Sequences",
            list: [
                {
                    ...titleToPuzzle["Sequence Sum"],
                    title: "Sequence Sum",
                    minimumSolvedToUnlock: 8,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSequence Sum",
                        description: "Title of the 'Sequence Sum' puzzle",
                        defaultMessage: "Sequence Sum",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSequence Sum",
                        description: "Description of the 'Sequence Sum' puzzle",
                        defaultMessage: "Read a sequence of positive numbers and output their sum. Repeat. Sequences are terminated by a zero.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSequence Sum",
                        description: "Hint for the 'Sequence Sum' puzzle",
                        defaultMessage: "<p>Store the value to test whether it indicates the end of the sequence.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Sequence Cardinality"],
                    title: "Sequence Cardinality",
                    minimumSolvedToUnlock: 8,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSequence Cardinality",
                        description: "Title of the 'Sequence Cardinality' puzzle",
                        defaultMessage: "Sequence Cardinality",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSequence Cardinality",
                        description: "Description of the 'Sequence Cardinality' puzzle",
                        defaultMessage: "Read a sequence of positive numbers and output the count of numbers. Repeat. Sequences are terminated by a zero.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSequence Cardinality",
                        description: "Hint for the 'Sequence Cardinality' puzzle",
                        defaultMessage: "<p>Increment a counter for each element in the sequence.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Number to Sequence"],
                    title: "Number to Sequence",
                    minimumSolvedToUnlock: 8,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleNumber to Sequence",
                        description: "Title of the 'Number to Sequence' puzzle",
                        defaultMessage: "Number to Sequence",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionNumber to Sequence",
                        description: "Description of the 'Number to Sequence' puzzle",
                        defaultMessage: "Read a number and then output that many 1s, followed by a 0. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintNumber to Sequence",
                        description: "Hint for the 'Number to Sequence' puzzle",
                        defaultMessage: "<p>Use a counter to write the appropriate number of <strong>1</strong>s.</p>",
                    }),
                },
            ],
        },
        {
            groupTitle: "Advanced Techniques",
            list: [
                {
                    ...titleToPuzzle["Self-Modifying Code"],
                    title: "Self-Modifying Code",
                    minimumSolvedToUnlock: 11,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSelf-Modifying Code",
                        description: "Title of the 'Self-Modifying Code' puzzle",
                        defaultMessage: "Self-Modifying Code",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSelf-Modifying Code",
                        description: "Description of the 'Self-Modifying Code' puzzle",
                        defaultMessage: "Output the program's compiled code byte-by-byte.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSelf-Modifying Code",
                        description: "Hint for the 'Self-Modifying Code' puzzle",
                        defaultMessage: "<p>This task has already been solved, but carefully note how the second byte of the first instruction is modified.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeSelf-Modifying Code",
                        description: "Initial code for the 'Self-Modifying Code' puzzle",
                        defaultMessage:
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
                    }),
                },
                {
                    ...titleToPuzzle["Stack Memory"],
                    title: "Stack Memory",
                    minimumSolvedToUnlock: 12,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleStack Memory",
                        description: "Title of the 'Stack Memory' puzzle",
                        defaultMessage: "Stack Memory",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionStack Memory",
                        description: "Description of the 'Stack Memory' puzzle",
                        defaultMessage: "Read 3 values from input and then output the values in reverse order.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintStack Memory",
                        description: "Hint for the 'Stack Memory' puzzle",
                        defaultMessage: "<p>This task has already been solved, but carefully watch the memory window to see how items are added to the stack.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeStack Memory",
                        description: "Initial code for the 'Stack Memory' puzzle",
                        defaultMessage:
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

; Base of stack (stack will grow to larger addresses, so no variables should be placed after this one)
@stack: .data 0
`
                    }),
                },
            ],
        },
        {
            groupTitle: "Sequence Manipulation",
            list: [
                {
                    ...titleToPuzzle["Reverse Sequence"],
                    title: "Reverse Sequence",
                    minimumSolvedToUnlock: 13,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleReverse Sequence",
                        description: "Title of the 'Reverse Sequence' puzzle",
                        defaultMessage: "Reverse Sequence",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionReverse Sequence",
                        description: "Description of the 'Reverse Sequence' puzzle",
                        defaultMessage: "Read a sequence of positive numbers (terminated by a zero) and output the sequence in reverse order (with zero terminator). Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintReverse Sequence",
                        description: "Hint for the 'Reverse Sequence' puzzle",
                        defaultMessage: "<p>Use a stack, and remember to clear the stack afterwards.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Interleave"],
                    title: "Interleave",
                    minimumSolvedToUnlock: 13,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleInterleave",
                        description: "Title of the 'Interleave' puzzle",
                        defaultMessage: "Interleave",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionInterleave",
                        description: "Description of the 'Interleave' puzzle",
                        defaultMessage: "Read two equal length positive sequences (A and B) and interleave their elements (A1, B1, A2, B2, ...), ending with a single zero. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintInterleave",
                        description: "Hint for the 'Interleave' puzzle",
                        defaultMessage: "<p>Store the first list for later output. Remember to clear the list afterwards.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Indicator Function"],
                    title: "Indicator Function",
                    minimumSolvedToUnlock: 13,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleIndicator Function",
                        description: "Title of the 'Indicator Function' puzzle",
                        defaultMessage: "Indicator Function",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionIndicator Function",
                        description: "Description of the 'Indicator Function' puzzle",
                        defaultMessage: "Read two zero-terminated sets of numbers on the interval [1, 99], A and B. For each element of B, output a 1 if the value is in A and 0 otherwise. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintIndicator Function",
                        description: "Hint for the 'Indicator Function' puzzle",
                        defaultMessage: "<p>Store the first list for later lookup. Remember to clear the list afterwards.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Sort"],
                    title: "Sort",
                    minimumSolvedToUnlock: 13,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSort",
                        description: "Title of the 'Sort' puzzle",
                        defaultMessage: "Sort",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSort",
                        description: "Description of the 'Sort' puzzle",
                        defaultMessage: "Read a list of numbers on the interval [1, 99] (terminated by a zero) and output the list ordered smallest to largest, ending with a zero. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSort",
                        description: "Hint for the 'Sort' puzzle",
                        defaultMessage: "<p>Insert items into memory in the correct position.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Mode"],
                    title: "Mode",
                    minimumSolvedToUnlock: 13,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleMode",
                        description: "Title of the 'Mode' puzzle",
                        defaultMessage: "Mode",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionMode",
                        description: "Description of the 'Mode' puzzle",
                        defaultMessage: "Read a list of numbers on the interval [1, 99] (terminated by a zero) and output the most common element. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintMode",
                        description: "Hint for the 'Mode' puzzle",
                        defaultMessage: "<p>Track both the items, as well as their count.</p>",
                    }),
                },
            ],
        },
        {
            groupTitle: "Natural Language Processing",
            list: [
                {
                    ...titleToPuzzle["Characters"],
                    title: "Characters",
                    minimumSolvedToUnlock: 18,
                    outputFormat: Format.characters,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleCharacters",
                        description: "Title of the 'Characters' puzzle",
                        defaultMessage: "Characters",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionCharacters",
                        description: "Description of the 'Characters' puzzle",
                        defaultMessage: "Output the following two characters: \"Hi\"",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintCharacters",
                        description: "Hint for the 'Characters' puzzle",
                        defaultMessage: "<p>This task has already been solved, but note how character literals are used (and negated).</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeCharacters",
                        description: "Initial code for the 'Characters' puzzle",
                        defaultMessage:
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
                    }),
                },
                {
                    ...titleToPuzzle["Decimal Digits"],
                    title: "Decimal Digits",
                    minimumSolvedToUnlock: 19,
                    inputFormat: Format.characters,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleDecimal Digits",
                        description: "Title of the 'Decimal Digits' puzzle",
                        defaultMessage: "Decimal Digits",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionDecimal Digits",
                        description: "Description of the 'Decimal Digits' puzzle",
                        defaultMessage: "Read a decimal digit character, output the numeric value. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintDecimal Digits",
                        description: "Hint for the 'Decimal Digits' puzzle",
                        defaultMessage: "<p>Subtract the character literal <code>''0''</code>.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeDecimal Digits",
                        description: "Initial code for the 'Decimal Digits' puzzle",
                        defaultMessage:
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
                    }),
                },
                {
                    ...titleToPuzzle["Uppercase"],
                    title: "Uppercase",
                    minimumSolvedToUnlock: 19,
                    inputFormat: Format.characters,
                    outputFormat: Format.characters,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleUppercase",
                        description: "Title of the 'Uppercase' puzzle",
                        defaultMessage: "Uppercase",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionUppercase",
                        description: "Description of the 'Uppercase' puzzle",
                        defaultMessage: "Read and output characters, converting all lowercase characters to uppercase.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintUppercase",
                        description: "Hint for the 'Uppercase' puzzle",
                        defaultMessage: "<p>Test to see if the input is between \"a\" and \"z\", and modify the value as needed.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeUppercase",
                        description: "Initial code for the 'Uppercase' puzzle",
                        defaultMessage:
`; Read and output characters. For each alphabetic character, convert it to uppercase if needed.
;
; Note that the mappings for 'a', 'b', ... 'z' are contiguous, as are 'A', 'B', ... 'Z'.

`
                    }),
                },
                {
                    ...titleToPuzzle["Strings"],
                    title: "Strings",
                    minimumSolvedToUnlock: 21,
                    outputFormat: Format.strings,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleStrings",
                        description: "Title of the 'Strings' puzzle",
                        defaultMessage: "Strings",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionStrings",
                        description: "Description of the 'Strings' puzzle",
                        defaultMessage: "Output the string \"Hello, world!\".",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintStrings",
                        description: "Hint for the 'Strings' puzzle",
                        defaultMessage: "<p>This task has already been solved, but note that strings are terminated by a zero.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeStrings",
                        description: "Initial code for the 'Strings' puzzle",
                        defaultMessage:
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
                    }),
                },
                {
                    ...titleToPuzzle["Tokenizer"],
                    title: "Tokenizer",
                    minimumSolvedToUnlock: 22,
                    inputFormat: Format.strings,
                    outputFormat: Format.strings,
                        displayTitle: intl.formatMessage({
                        id: "puzzleTitleTokenizer",
                        description: "Title of the 'Tokenizer' puzzle",
                        defaultMessage: "Tokenizer",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionTokenizer",
                        description: "Description of the 'Tokenizer' puzzle",
                        defaultMessage: "Read a string and output each word as its own string. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintTokenizer",
                        description: "Hint for the 'Tokenizer' puzzle",
                        defaultMessage: "<p>Strings are terminated by a single zero.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeTokenizer",
                        description: "Initial code for the 'Tokenizer' puzzle",
                        defaultMessage:
`; Read a string and output each word as its own string. Repeat.
;
; Note: words are each separated by a single space (and the last word ends with a zero).

`
                    }),
                },
                {
                    ...titleToPuzzle["Parse Decimal"],
                    title: "Parse Decimal",
                    minimumSolvedToUnlock: 22,
                    inputFormat: Format.strings,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleParse Decimal",
                        description: "Title of the 'Parse Decimal' puzzle",
                        defaultMessage: "Parse Decimal",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionParse Decimal",
                        description: "Description of the 'Parse Decimal' puzzle",
                        defaultMessage: "Read a string representing a number on the interval [1, 127] and output the corresponding value. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintParse Decimal",
                        description: "Hint for the 'Parse Decimal' puzzle",
                        defaultMessage: "<p>Shifting left one decimal digit is the same as multiplying by ten.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Print Decimal"],
                    title: "Print Decimal",
                    minimumSolvedToUnlock: 22,
                    outputFormat: Format.strings,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitlePrint Decimal",
                        description: "Title of the 'Print Decimal' puzzle",
                        defaultMessage: "Print Decimal",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionPrint Decimal",
                        description: "Description of the 'Print Decimal' puzzle",
                        defaultMessage: "Read a positive number on the interval [1, 127] and output a string representing the number in decimal form. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintPrint Decimal",
                        description: "Hint for the 'Print Decimal' puzzle",
                        defaultMessage: "<p>Remember to output digits from most significant to least.</p>",
                    }),
                },
                {
                    ...titleToPuzzle["Calculator"],
                    title: "Calculator",
                    minimumSolvedToUnlock: 22,
                    inputFormat: Format.strings,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleCalculator",
                        description: "Title of the 'Calculator' puzzle",
                        defaultMessage: "Calculator",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionCalculator",
                        description: "Description of the 'Calculator' puzzle",
                        defaultMessage: "Read a string representing arithmetic (+, -, or *) on 2 numbers on the interval [1, 127]; write out the resulting value. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintCalculator",
                        description: "Hint for the 'Calculator' puzzle",
                        defaultMessage: "<p>Combine the solutions to \"Addition\", \"Subtraction\", \"Multiplication\", and \"Parse Decimal\".</p>",
                    }),
                },
            ],
        },
        {
            groupTitle: "Self-Hosting",
            list: [
                {
                    ...titleToPuzzle["Multi-Line Strings"],
                    title: "Multi-Line Strings",
                    minimumSolvedToUnlock: 26,
                    inputFormat: Format.strings,
                    outputFormat: Format.strings,
                        displayTitle: intl.formatMessage({
                        id: "puzzleTitleMulti-Line Strings",
                        description: "Title of the 'Multi-Line Strings' puzzle",
                        defaultMessage: "Multi-Line Strings",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionMulti-Line Strings",
                        description: "Description of the 'Multi-Line Strings' puzzle",
                        defaultMessage: "Read a string with multiple lines and write out each line as a string.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintMulti-Line Strings",
                        description: "Hint for the 'Multi-Line Strings' puzzle",
                        defaultMessage: "<p>This task is very similar to Tokenizer.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeMulti-Line Strings",
                        description: "Initial code for the 'Multi-Line Strings' puzzle",
                        defaultMessage:
`; New line characters (value 10) can be expressed with the character '\\n'. They can also be used in strings, for example: "Line 1\\nLine 2".
;
; Read a string with multiple lines and write out each line as a string.

`
                    }),
                },
                {
                    ...titleToPuzzle["Parse Data Directives"],
                    title: "Parse Data Directives",
                    minimumSolvedToUnlock: 27,
                    inputFormat: Format.strings,
                    song: Songs.light,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleParse Data Directives",
                        description: "Title of the 'Parse Data Directives' puzzle",
                        defaultMessage: "Parse Data Directives",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionParse Data Directives",
                        description: "Description of the 'Parse Data Directives' puzzle",
                        defaultMessage: "Parse a program with multiple .data directives and output the corresponding values.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintParse Data Directives",
                        description: "Hint for the 'Parse Data Directives' puzzle",
                        defaultMessage: "<p>This task is similar to \"Parse Decimal\", but negative numbers need to be handled.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeParse Data Directives",
                        description: "Initial code for the 'Parse Data Directives' puzzle",
                        defaultMessage:
`; Parse a program with multiple .data directives and output the corresponding values.
;
; Each .data directive only has a single value on the range [-128, 127] (inclusive).

`
                    }),
                },
                {
                    ...titleToPuzzle["Parse Subleq Instructions"],
                    title: "Parse Subleq Instructions",
                    minimumSolvedToUnlock: 28,
                    inputFormat: Format.strings,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleParse Subleq Instructions",
                        description: "Title of the 'Parse Subleq Instructions' puzzle",
                        defaultMessage: "Parse Subleq Instructions",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionParse Subleq Instructions",
                        description: "Description of the 'Parse Subleq Instructions' puzzle",
                        defaultMessage: "Parse a program with multiple subleq instructions and output the compiled program.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintParse Subleq Instructions",
                        description: "Hint for the 'Parse Subleq Instructions' puzzle",
                        defaultMessage: "<p>This task is very similar to \"Parse Decimal\".</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeParse Subleq Instructions",
                        description: "Initial code for the 'Parse Subleq Instructions' puzzle",
                        defaultMessage:
`; Parse a program with multiple subleq instructions and output the compiled program.
;
; Each subleq instruction specifies 3 addresses, separated by spaces (' '). The addresses are on the range [0, 255] (inclusive).
;
; Note that the unsigned (nonnegative) addresses will be written out as signed values on the range [-128, 127] (also inclusive). For example, 255 becomes -1, 254 becomes -2, ..., 128 becomes -128, but 127 and below are unchanged.

`
                    }),
                },
                {
                    ...titleToPuzzle["Self-Hosting"],
                    title: "Self-Hosting",
                    minimumSolvedToUnlock: 29,
                    inputFormat: Format.strings,
                    song: Songs.major,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSelf-Hosting",
                        description: "Title of the 'Self-Hosting' puzzle",
                        defaultMessage: "Self-Hosting",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSelf-Hosting",
                        description: "Description of the 'Self-Hosting' puzzle",
                        defaultMessage: "Read in a SIC-1 program and execute it until it branches to address 255, writing out any values written to address 254. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSelf-Hosting",
                        description: "Hint for the 'Self-Hosting' puzzle",
                        defaultMessage: "<p>Use previous decimal-parsing solutions to compile the program, but take care to follow the instructions precisely.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeSelf-Hosting",
                        description: "Initial code for the 'Self-Hosting' puzzle",
                        defaultMessage:
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
                    }),
                },
                {
                    ...titleToPuzzle["Self-Hosting Part 2"],
                    title: "Self-Hosting Part 2",
                    minimumSolvedToUnlock: 30,
                    inputFormat: Format.strings,
                    song: Songs.boss,
                    displayTitle: intl.formatMessage({
                        id: "puzzleTitleSelf-Hosting Part 2",
                        description: "Title of the 'Self-Hosting Part 2' puzzle",
                        defaultMessage: "Self-Hosting Part 2",
                    }),
                    description: intl.formatMessage({
                        id: "puzzleDescriptionSelf-Hosting Part 2",
                        description: "Description of the 'Self-Hosting Part 2' puzzle",
                        defaultMessage: "Read in a self-modifying SIC-1 program and execute it until it branches to address 255, writing out any values written to address 254. Repeat.",
                    }),
                    hint: intl.formatMessage({
                        id: "puzzleHintSelf-Hosting Part 2",
                        description: "Hint for the 'Self-Hosting Part 2' puzzle",
                        defaultMessage: "<p>You're on your own for this one.</p>",
                    }),
                    code: intl.formatMessage({
                        id: "puzzleCodeSelf-Hosting Part 2",
                        description: "Initial code for the 'Self-Hosting Part 2' puzzle",
                        defaultMessage:
`; Parse a self-modifying program containing .data directives and subleq instructions, then execute that program.
;
; Writes to address @OUT should be directly written out. If the program branches to address @HALT, then the program is done. Start over from scratch with the next input program.
;
; The compiled size of each input program is <= 21 bytes.
;
; As in previous tasks, the .data directive will always have exactly 1 value and subleq instructions will specify exactly 3 addresses (separated by spaces only) and no labels will be used.

`
                    }),
                },
            ],
        },
    ];

    const puzzleFlatArray = [].concat(...clientPuzzlesGrouped.map(p => p.list));

    return {
        clientPuzzlesGrouped,
        puzzleFlatArray,
        clientPuzzles: [].concat(...puzzleFlatArray, puzzleSandbox),
    };
}
