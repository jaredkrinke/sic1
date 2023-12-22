import { readFile, writeFile } from "fs/promises";
import { ProgramVerificationError, Puzzle, solutionBytesMax, verifySolution } from "../../shared/puzzles";

type SolutionSource = "web" | "steam";

export interface Solution {
    puzzleTitle: string;
    userId: string;
    cycles: number | null;
    bytes: number | null;
    program: string;

    // Metadata
    source: SolutionSource;
    time?: string;
    focus: "cycles" | "bytes";
}

export type SolutionDatabaseEntry = Omit<Solution, "puzzleTitle" | "userId" | "focus">;

export interface SolutionDatabase {
    [puzzleTitle: string]: {
        [userId: string]: {
            [focus: string]: SolutionDatabaseEntry;
        }
    }
}

export const solutionDatabasePath = "db.json";
export const cyclesExecutedMax = 10000;

function leftPad(numberString: string, digits: number): string {
    return (numberString.length === digits) ? numberString : ("0".repeat(digits - numberString.length) + numberString);
}

export function readTextFileAsync(path: string): Promise<string> {
    return readFile(path, { encoding: "utf8" });
}

export async function tryReadTextFileAsync(path: string): Promise<string | undefined> {
    try {
        return await readTextFileAsync(path);
    } catch (error) {
        if (error.code === "ENOENT") {
            return undefined;
        } else {
            throw error;
        }
    }
}

export async function readSolutionDatabaseAsync(): Promise<SolutionDatabase> {
    return JSON.parse((await tryReadTextFileAsync(solutionDatabasePath)) ?? "{}") as SolutionDatabase;
}

export function writeTextFileAsync(path: string, content: string): Promise<void> {
    return writeFile(path, content, { encoding: "utf8"});
}

export function getAppIdAsync(): Promise<string> {
    return readTextFileAsync("../../client/windows/steam_appid.txt");
}

export function getApiKeyAsync(): Promise<string> {
    return readTextFileAsync("steamapi_key.txt");
}

export function hexifyBytes(bytes: number[]): string {
    return bytes.map(b => leftPad(b.toString(16), 2)).join("");
}

export function unhexifyBytes(text: string): number[] {
    const result: number[] = [];
    for (let i = 0; (i + 1) < text.length; i += 2) {
        result.push(parseInt(text.substring(i, i + 2), 16));
    }
    return result;
}

export function isSolutionValid(puzzle: Puzzle, solution: SolutionDatabaseEntry): boolean {
    try {
        verifySolution(
            puzzle,
            unhexifyBytes(solution.program),
            solution.cycles ?? cyclesExecutedMax,
            solution.bytes ?? solutionBytesMax,
        );
        
        return true;
    } catch (error) {
        if (error instanceof ProgramVerificationError) {
            return false;
        }

        throw error;
    }
}

/** Number of validation iterations to run before deciding a solution is actually robust */
export const validationIterations = 200;

/** Returns true if the solution is correct for all @validationIterations iterations */
export function isSolutionRobustlyValid(puzzle: Puzzle, solution: SolutionDatabaseEntry): boolean {
    for (let i = 0; i < validationIterations; i++) {
        if (!isSolutionValid(puzzle, solution)) {
            return false;
        }
    }
    return true;
}
