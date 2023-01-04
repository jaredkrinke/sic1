import { ComponentChildren } from "preact";
import { Puzzle, puzzleFlatArray } from "sic1-shared";

type ConfigurablePuzzle = Omit<Puzzle, "io"> & {
    customInput: true;
};

export type ClientPuzzle = (Puzzle | ConfigurablePuzzle) & {
    puzzleViewOverride?: ComponentChildren;
};

export const puzzleSandbox: ClientPuzzle = {
    title: "Sandbox Mode",
    description: "An open-ended, configurable program for exploration purposes.",
    minimumSolvedToUnlock: 4,
    song: "elevator",
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

export function hasCustomInput(puzzle: ClientPuzzle): puzzle is ConfigurablePuzzle {
    return !!puzzle["customInput"];
}

/** Includes both story puzzles, as well as extra puzzles. */
export const clientPuzzles: ClientPuzzle[] = [...puzzleFlatArray, puzzleSandbox];
