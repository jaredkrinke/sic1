// This is a command line tool for validating downloaded solutions
//
// USAGE: ts-node script.ts <path to JSON file>

import { readFile } from "fs/promises";
import { puzzleFlatArray, verifySolution as verifySolutionInternal } from "../../shared/puzzles";
import { Solution, unhexifyBytes } from "./shared";

function verifySolution(puzzleTitle: string, bytes: number[], cyclesExecuted: number, memoryBytesAccessed: number) {
    try {
        verifySolutionInternal(puzzleFlatArray.find(p => p.title === puzzleTitle), bytes, cyclesExecuted, memoryBytesAccessed);
        return true;
    } catch {
        return false;
    }
}

(async () => {
    const [ _exePath, _scriptPath, path ] = process.argv;

    const solutions: Solution[] = JSON.parse(await readFile(path, { encoding: "utf8" }));
    for (const { puzzleTitle, userId, cycles, bytes, program } of solutions) {
        console.log(`${userId}\t(${cycles ? `cycles: ${cycles}` : `bytes: ${bytes}`})${
            verifySolution(puzzleTitle, unhexifyBytes(program), cycles, bytes)
                ? ""
                : " *** Invalid! ***"
            }`);
    }
})();
