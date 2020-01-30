// Shared definitions
export interface HistogramDataBucket {
    bucketMax: number;
    count: number;
}

export type HistogramData = HistogramDataBucket[];

// User stats
export const UserStatsRoute = "/stats/users"; // GET
export interface UserStatsRequestQuery {
    userId: string;
}

export interface UserStatsResponse {
    solutionsByUser: HistogramData;
    userSolvedCount: number;
}

// Puzzle stats
export const PuzzleStatsRoute = "/stats/test/:testName"; // GET
export interface PuzzleStatsRequestParameters {
    testName: string;
}

export interface PuzzleStatsResponse {
    cyclesExecutedBySolution: HistogramData;
    memoryBytesAccessedBySolution: HistogramData;
}

// Solution upload
export const SolutionUploadRoute = "/solutions/:testName"; // POST
export interface SolutionUploadRequestParameters {
    testName: string;
}

export interface SolutionUploadRequestBody {
    userId: string;
    solutionCycles: number;
    solutionBytes: number;
    program: string;
}
