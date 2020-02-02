export interface Puzzle {
    title: string;
    minimumSolvedToUnlock: number; // TODO: Better approach here?
    description: string;
    test?: {
        createRandomTest: () => number[][];
        getExpectedOutput: (input: number[][]) => number[][];
    };
    code?: string;
    io: number[][][];
}
