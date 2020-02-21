// Shared definitions
export interface HistogramDataBucket {
    bucketMax: number;
    count: number;
}

export type HistogramData = HistogramDataBucket[];

// User profile
export const UserProfileRoute = "/users/:userId"; // GET, PUT
export const UserNameMaxLength = 50;
export interface UserProfileRequestParameters {
    userId: string;
}

export interface UserProfileGetResponse {
    name: string;
}

export interface UserProfilePutRequestBody {
    name: string;
}

// User stats
export const UserStatsRoute = "/stats/users"; // GET
export interface UserStatsRequestQuery {
    userId: string;
}

export interface UserStatsResponse {
    solutionsByUser: HistogramData;
    userSolvedCount: number;
}

// Leaderboard
export const LeaderboardRoute = "/stats/top"; // GET
export interface LeaderboardEntry {
    name: string;
    solved: number;
}

export type LeaderboardReponse = LeaderboardEntry[];

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
