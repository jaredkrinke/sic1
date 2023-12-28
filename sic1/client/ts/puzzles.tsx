import React from "react";
import { Puzzle, puzzles } from "../../shared/puzzles";

type ClientPuzzleStatic = Puzzle & {
    puzzleViewOverride?: React.ReactNode;
    hint: React.ReactNode;
}

type ClientPuzzleConfigurable = Omit<ClientPuzzleStatic, "io"> & {
    customInput: true;
};

export type ClientPuzzle = ClientPuzzleStatic | ClientPuzzleConfigurable;

export const puzzleSandbox: ClientPuzzle = {
    title: "Sandbox Mode",
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

type PuzzleTitle = typeof puzzles[number]["list"][number]["title"];

function getHintForPuzzle(title: PuzzleTitle): React.ReactNode {
    switch (title) {
        case "Subleq Instruction and Output": return <p>This task has already been solved. Just click <strong>Run</strong>.</p>;
        case "Data Directive and Looping": return <p>This task has already been solved. Just click <strong>Run</strong>.</p>;
        case "First Assessment": return <p>Negate the value twice (these operations cancel out and result in the original number). This can be done by storing the negated value in a memory location that starts out as zero (e.g. <code>@tmp</code>).</p>;
        case "Addition": return <p>Subtract two inputs into <code>@tmp</code>.</p>;
        case "Subtraction": return <p>Use two variables.</p>;
        case "Sign Function": return <p>Use the "branch if result is &lt;= 0" property of subleq to branch between code blocks, then use (negated) constants to write the appropriate output.</p>;
        case "Multiplication": return <p>Repeatedly subtract one of the numbers, using a counter to ensure the subtraction is done the appropriate number of times.</p>;
        case "Division": return <p>Repeatedly subtract the divisor from the dividend.</p>;
        case "Sequence Sum": return <p>Store the value to test whether it indicates the end of the sequence.</p>;
        case "Sequence Cardinality": return <p>Increment a counter for each element in the sequence.</p>;
        case "Number to Sequence": return <p>Use a counter to write the appropriate number of <strong>1</strong>s.</p>;
        case "Self-Modifying Code": return <p>This task has already been solved, but carefully note how the second byte of the first instruction is modified.</p>;
        case "Stack Memory": return <p>This task has already been solved, but carefully watch the memory window to see how items are added to the stack.</p>;
        case "Reverse Sequence": return <p>Use a stack, and remember to clear the stack afterwards.</p>;
        case "Interleave": return <p>Store the first list for later output. Remember to clear the list afterwards.</p>;
        case "Indicator Function": return <p>Store the first list for later lookup. Remember to clear the list afterwards.</p>;
        case "Sort": return <p>Insert items into memory in the correct position.</p>;
        case "Mode": return <p>Track both the items, as well as their count.</p>;
        case "Characters": return <p>This task has already been solved, but note how character literals are used (and negated).</p>;
        case "Decimal Digits": return <p>Subtract the character literal <code>'0'</code>.</p>;
        case "Uppercase": return <p>Test to see if the input is between "a" and "z", and modify the value as needed.</p>;
        case "Strings": return <p>This task has already been solved, but note that strings are terminated by a zero.</p>;
        case "Tokenizer": return <p>Strings are terminated by a single zero.</p>;
        case "Parse Decimal": return <p>Shifting left one decimal digit is the same as multiplying by ten.</p>;
        case "Print Decimal": return <p>Remember to output digits from most significant to least.</p>;
        case "Calculator": return <p>Combine the solutions to "Addition", "Subtraction", "Multiplication", and "Parse Decimal".</p>;
        case "Multi-Line Strings": return <p>This task is very similar to Tokenizer.</p>;
        case "Parse Data Directives": return <p>This task is similar to "Parse Decimal", but negative numbers need to be handled.</p>;
        case "Parse Subleq Instructions": return <p>This task is very similar to "Parse Decimal".</p>;
        case "Self-Hosting": return <p>Use previous decimal-parsing solutions to compile the program, but take care to follow the instructions precisely.</p>;
        case "Self-Hosting Part 2": return <p>You're on your own for this one.</p>;

        // Exhaustiveness check
        default:
            const error: never = title;
            return error;
    }
}

interface ClientPuzzleGroup {
    groupTitle: string;
    list: ClientPuzzle[];
}

export const clientPuzzlesGrouped: ClientPuzzleGroup[] = puzzles.map(({ groupTitle, list }) => ({
    groupTitle,
    list: list.map(puzzle => ({
        ...puzzle,
        hint: getHintForPuzzle(puzzle.title as PuzzleTitle),
    })),
}));

/** Includes both story puzzles, as well as extra puzzles. */
export const clientPuzzles: ClientPuzzle[] = [].concat(...clientPuzzlesGrouped.map(p => p.list), puzzleSandbox);
