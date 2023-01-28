// This is a command line tool for extracting solutions from the V2 web archive JSON into a format that's compatible with Steam data
//
// USAGE: ts-node script.ts [puzzle title] [focus]

import { Solution } from "../../tools/cli/shared";
import { puzzleFlatArray } from "../../shared/puzzles";
import { readFile } from "fs/promises";
import { HistogramDocument, SolutionDocument, UserDocument } from "./shared";

type Archive = { [id: string]: { data: (HistogramDocument | SolutionDocument | UserDocument) }};

const focusTitleToFocus = {
    cyclesExecuted: "cycles",
    memoryBytesAccessed: "bytes",
} as const;

function serializedFirestoreTimestampToDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return new Date(timestamp["_seconds"] * 1000);
}

(async () => {
    const [ _exePath, _scriptPath, puzzleTitleRaw ] = process.argv;
    const puzzleTitles = puzzleTitleRaw ? [puzzleTitleRaw] : puzzleFlatArray.map(p => p.title);

    const solutions: Solution[] = [];
    const archive: Archive = JSON.parse(await readFile("archive.json", { encoding: "utf8" }));
    const solutionPattern = /^Puzzle_([^_]+)_([^_]+)_([^_]+)$/;

    for (const [id, document] of Object.entries(archive)) {
        const matches = solutionPattern.exec(id);
        if (matches) {
            const [_all, userId, puzzleTitle, focus] = matches;
            if (puzzleTitles.includes(puzzleTitle)) {
                const solutionDocument = document.data as SolutionDocument;
                solutions.push({
                    puzzleTitle,
                    userId: `web:${userId}`,
                    cycles: solutionDocument.cyclesExecuted,
                    bytes: solutionDocument.memoryBytesAccessed,
                    program: solutionDocument.program,

                    source: "web",
                    focus: focusTitleToFocus[focus],
                    time: serializedFirestoreTimestampToDate(solutionDocument.timestamp).toISOString(),
                });
            }
        }
    }

    console.log(JSON.stringify(solutions));
})();
