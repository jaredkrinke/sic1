export interface Puzzle {
    title: string;
    minimumSolvedToUnlock: number; // TODO: Better approach here?
    description: string;
    code: string;
    io: (number | number[])[][];
}

export interface PuzzleGroup {
    groupTitle: string;
    list: Puzzle[];
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

; First, click \"Load\" to compile the program and load it
; into memory, then use the \"Step\" and \"Run\" buttons to
; execute the program until all expected outputs have been
; successfully written out (see the.
; \"In\"/\"Expected\"/\"Out\" table to the left).
`
                ,
                io: [
                    [3, -3]
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
                    [3, -3],
                    [4, -4],
                    [5, -5]
                ]
            },
            {
                title: "First Assessment",
                minimumSolvedToUnlock: 2,
                description: "Write input values to output.",
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
                    [1, 1],
                    [2, 2],
                    [3, 3]
                ]
            },
        ],
    },
    // TODO: Remaining puzzle groups
];
