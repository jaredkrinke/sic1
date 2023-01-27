import { readFile } from "fs/promises";

type SolutionSource = "web" | "steam";

export interface Solution {
    puzzleTitle: string;
    userId: string;
    cycles: number | null;
    bytes: number | null;
    program: string;

    // Metadata
    source: SolutionSource;
    time: string;
}

function leftPad(numberString: string, digits: number): string {
    return (numberString.length === digits) ? numberString : ("0".repeat(digits - numberString.length) + numberString);
}

function createSolutionId(solution: Solution): string {
    return `${solution.puzzleTitle}:${solution.program}`;
}

export function getAppIdAsync(): Promise<string> {
    return readFile("../../client/windows/steam_appid.txt", { encoding: "utf8" });
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
