export interface Puzzle {
    title: string;
    minimumSolvedToUnlock: number; // TODO: Better approach here?
    description: string;
    code?: string;
    io: (number | number[])[][];
}
