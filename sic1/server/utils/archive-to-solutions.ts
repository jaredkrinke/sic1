// This is a command line tool for extracting solutions from the V2 web archive JSON into a format that's compatible with Steam data
//
// USAGE: ts-node script.ts [puzzle title] [focus]

import { Solution, unhexifyBytes } from "../../tools/cli/shared";
import { puzzleFlatArray } from "../../shared/puzzles";
import { readFile } from "fs/promises";
import { HistogramDocument, SolutionDocument, UserDocument } from "./shared";

type Archive = { [id: string]: { data: (HistogramDocument | SolutionDocument | UserDocument) }};

const focusToProperty = {
    cycles: "cyclesExecuted",
    bytes: "memoryBytesAccessed",
} as const;

(async () => {
    const [ _exePath, _scriptPath, puzzleTitleRaw, focusRaw ] = process.argv;
    const foci = (focusRaw ? [focusRaw] : ["cycles", "bytes"]).map(f => focusToProperty[f]);
    const puzzleTitles = puzzleTitleRaw ? [puzzleTitleRaw] : puzzleFlatArray.map(p => p.title);

    const solutions: Solution[] = [];
    const archive: Archive = JSON.parse(await readFile("archive.json", { encoding: "utf8" }));
    const solutionPattern = /^Puzzle_([^_]+)_([^_]+)_([^_]+)$/;

    for (const [id, document] of Object.entries(archive)) {
        const matches = solutionPattern.exec(id);
        if (matches) {
            const [_all, userId, puzzleTitle, focus] = matches;
            if (puzzleTitles.includes(puzzleTitle) && foci.includes(focus)) {
                const solutionDocument = document.data as SolutionDocument;
                // console.log(document);
                solutions.push({
                    puzzleTitle,
                    userId: `itch:${userId}`,
                    cycles: solutionDocument.cyclesExecuted,
                    bytes: solutionDocument.memoryBytesAccessed,
                    program: unhexifyBytes(solutionDocument.program),
                });
            }
        }
    }

    console.log(JSON.stringify(solutions));
})();
