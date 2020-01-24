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
            // TODO: Remaining puzzles
        ],
    },
    // TODO: Remaining puzzle groups
];
