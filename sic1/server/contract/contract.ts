// Shared definitions
export interface HistogramBucket {
    bucket: number;
    count: number;
}

export interface Histogram {
    buckets: HistogramBucket[];
    maxCount: number;
}

// User stats
export const UserStatsRoute = "/stats/users"; // GET
export interface UserStatsRequestQuery {
    userId: string;
}

export interface UserStatsResponse {
    distribution: Histogram;
    validatedSolutions: number;
}

// Puzzle stats
export const PuzzleStatsRoute = "/stats/test/:testName"; // GET
export interface PuzzleStatsRequestParameters {
    testName: string;
}

export interface PuzzleStatsQuery {
    cycles: number;
    bytes: number;
}

export interface PuzzleStatsResponse {
    cycles: Histogram;
    bytes: Histogram;
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
