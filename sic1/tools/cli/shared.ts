import { readFile } from "fs/promises";

export interface Solution {
    puzzleTitle: string;
    userId: string;
    cycles: number | null;
    bytes: number | null;
    program: number[];
}

export function getAppIdAsync(): Promise<string> {
    return readFile("../../client/windows/steam_appid.txt", { encoding: "utf8" });
}

export function unhexifyBytes(text: string): number[] {
    const result: number[] = [];
    for (let i = 0; (i + 1) < text.length; i += 2) {
        result.push(parseInt(text.substring(i, i + 2), 16));
    }
    return result;
}
