export interface Puzzle {
    title: string;
    minimumSolvedToUnlock: number; // TODO: Better approach here?
    description: string;
    createRandomTest: () => number[][];
    getExpectedOutput: (input: number[][]) => number[][];
    code?: string;
    io: number[][][];
}
