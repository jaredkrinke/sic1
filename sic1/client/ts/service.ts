import * as Contract from "sic1-server-contract";
import { Shared } from "./shared";
import { ChartData } from "./chart-model";
import statsCache from "./stats-cache";
import { FriendLeaderboardEntry, SteamApi } from "./steam-api";

export { FriendLeaderboardEntry } from "./steam-api";

export type LeaderboardEntry = Contract.LeaderboardEntry;
type Focus = "cycles" | "bytes";

export interface ScoreChange {
    improved: boolean;
    oldScore: number;
    newScore: number;
}

export interface StatChanges {
    solvedCount: ScoreChange;
    cycles: ScoreChange;
    bytes: ScoreChange;
}

export interface PuzzleFriendLeaderboardPromises {
    cycles: Promise<FriendLeaderboardEntry[]>;
    bytes: Promise<FriendLeaderboardEntry[]>;
}

export interface Sic1Service {
    updateUserProfileAsync(userId: string, name: string): Promise<void>;
    getPuzzleStatsAsync(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData, bytes: ChartData }>;
    getUserStatsAsync(userId: string, solvedCount: number): Promise<ChartData>;

    // Note: this is a pre-Steam release leaderboard of just the top solved counts globally, with user names.
    // Eventually, it can probably be removed (once the leaderboard is completely full).
    getLeaderboardAsync?(): Promise<LeaderboardEntry[]>;

    updateStatsIfNeededAsync(userId: string, puzzleTitle: string, programBytes: number[], changes: StatChanges): PuzzleFriendLeaderboardPromises | undefined;

    // Steam leaderboards
    getFriendLeaderboardAsync?: (leaderboardName: string) => Promise<FriendLeaderboardEntry[]>;
    getPuzzleFriendLeaderboardAsync?: (puzzleTitle: string, focus: Focus) => Promise<FriendLeaderboardEntry[]>;
}

const identity = <T extends unknown>(x: T) => x;

type ParameterList<T> = {[K in keyof T]: string | number | boolean | undefined | null};

interface HistogramBounds {
    min: number;
    max: number;
    bucketSize: number;
}

const puzzleBucketCount = 20;
const userBucketCount = 30;

function calculateBounds(min: number, max: number, bucketCount: number): HistogramBounds {
    // Center the results if they're not spread out very much
    if ((max - min) < bucketCount) {
        min = Math.max(1, min - (bucketCount / 2));
    }

    return {
        min,
        max,
        bucketSize: Math.max(1, Math.ceil((max - min + 1) / bucketCount)),
    }
}

function sortAndNormalizeHistogramData(data: Contract.HistogramData, bucketCount: number): Contract.HistogramData {
    let min = 0;
    let max = 0;
    if (data.length > 0) {
        min = data[0].bucketMax;
        max = data[0].bucketMax;
        for (const item of data) {
            min = Math.min(min, item.bucketMax);
            max = Math.max(max, item.bucketMax);
        }
    }

    const bounds = calculateBounds(min, max, bucketCount);
    let buckets: Contract.HistogramDataBucket[] = [];

    // Initialize
    let bucketed: {[bucket: number]: number} = {};
    for (let i = 0; i < bucketCount; i++) {
        const bucket = bounds.min + (bounds.bucketSize * i);
        bucketed[bucket] = 0;
    }

    // Aggregate
    for (let i = 0; i < data.length; i++) {
        const bucket = Math.floor((data[i].bucketMax - bounds.min) / bounds.bucketSize) * bounds.bucketSize + bounds.min;
        bucketed[bucket] += data[i].count;
    }

    // Project
    for (const bucketMax in bucketed) {
        const count = bucketed[bucketMax];
        buckets.push({
            bucketMax: parseInt(bucketMax),
            count,
        });
    }

    return buckets;
}

function enrichAndAggregatePuzzleStats(data: Contract.PuzzleStatsResponse, cycles: number, bytes: number): { cycles: ChartData, bytes: ChartData } {
    // Merge and normalize data
    const cyclesHistogram = sortAndNormalizeHistogramData(data.cyclesExecutedBySolution.concat([{ bucketMax: cycles, count: 1 }]), puzzleBucketCount);
    const bytesHistogram = sortAndNormalizeHistogramData(data.memoryBytesAccessedBySolution.concat([{ bucketMax: bytes, count: 1 }]), puzzleBucketCount);
    return {
        cycles: {
            histogram: cyclesHistogram,
            highlightedValue: cycles,
        },
        bytes: {
            histogram: bytesHistogram,
            highlightedValue: bytes,
        },
    };
}

function enrichAndAggregateUserStats(data: Contract.UserStatsResponse, solvedCount: number): ChartData {
    const histogram = sortAndNormalizeHistogramData(data.solutionsByUser.concat([{ bucketMax: solvedCount, count: 1 }]), userBucketCount);

    // Highlight whatever solvedCount is expected locally. This is currently needed for Steam users (who
    // never upload solutions), but is arguably more user-friendly anyway.
    return {
        histogram: histogram,
        highlightedValue: solvedCount,
    };
}

export class Sic1WebService implements Sic1Service {
    public static readonly userNameMaxLength = Contract.UserNameMaxLength;

    private readonly root = "https://sic1-db.netlify.app/.netlify/functions/api";
    // private readonly root = "http://localhost:8888/.netlify/functions/api"; // Local test server

    private createQueryString<T>(o: ParameterList<T>): string {
        let str = "";
        let first = true;
        for (const key in o) {
            const value = o[key];
            if (value !== undefined && value !== null) {
                str += `${first ? "?" : "&"}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                first = false;
            }
        }
        return str;
    }

    private replaceParameters<T>(path: string, o: ParameterList<T>): string {
        for (const key in o) {
            const value = o[key];
            if (value !== undefined && value !== null) {
                path = path.replace(`:${key}`, encodeURIComponent(value));
            }
        }
        return path;
    }

    private createUri<P, Q>(path: string, parameters: ParameterList<P>, query: ParameterList<Q>) {
        return this.root
            + this.replaceParameters(path, parameters)
            + this.createQueryString(query);
    }

    public async updateUserProfileAsync(userId: string, name: string): Promise<void> {
        await fetch(
            this.createUri<Contract.UserProfileRequestParameters, {}>(
                Contract.UserProfileRoute,
                { userId },
                {}),
            {
                method: "PUT",
                mode: "cors",
                body: JSON.stringify(identity<Contract.UserProfilePutRequestBody>({ name })),
            }
        );
    }

    public async getPuzzleStatsRawAsync(puzzleTitle: string): Promise<Contract.PuzzleStatsResponse> {
        const response = await fetch(
            this.createUri<Contract.PuzzleStatsRequestParameters, {}>(
                Contract.PuzzleStatsRoute,
                { testName: puzzleTitle },
                {}),
            {
                method: "GET",
                mode: "cors",
            }
        );

        if (response.ok) {
            return await response.json() as Contract.PuzzleStatsResponse;
        }

        throw new Error("Request failed");
    }

    public async getPuzzleStatsAsync(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData, bytes: ChartData }> {
        let data: Contract.PuzzleStatsResponse;
        try {
            data = await this.getPuzzleStatsRawAsync(puzzleTitle);
        } catch {
            // Fallback to cached stats
            data = statsCache.puzzleStats[puzzleTitle];
        }

        return enrichAndAggregatePuzzleStats(data, cycles, bytes);
    }

    public async getUserStatsRawAsync(userId?: string): Promise<Contract.UserStatsResponse> {
        const response = await fetch(
            this.createUri<{}, Contract.UserStatsRequestQuery>(
                Contract.UserStatsRoute,
                {},
                { userId },
            ),
            {
                method: "GET",
                mode: "cors",
            }
        );

        if (response.ok) {
            return await response.json() as Contract.UserStatsResponse;
        }

        throw new Error("Request failed");
    }

    public async getUserStatsAsync(userId: string, solvedCount: number): Promise<ChartData> {
        let data: Contract.UserStatsResponse;
        try {
            data = await this.getUserStatsRawAsync(userId);
        } catch {
            // Fallback to cached stats
            data = statsCache.userStats;
        }
        return enrichAndAggregateUserStats(data, solvedCount);
    }

    public async getLeaderboardAsync(): Promise<LeaderboardEntry[]> {
        const response = await fetch(
            this.createUri<{}, {}>(Contract.LeaderboardRoute, {}, {}),
            {
                method: "GET",
                mode: "cors",
            }
        );

        if (response.ok) {
            const data = await response.json() as Contract.LeaderboardReponse;
            return data;
        }

        throw new Error("Request failed");
    }

    public updateStatsIfNeededAsync(userId: string, puzzleTitle: string, programBytes: number[], changes: StatChanges): PuzzleFriendLeaderboardPromises | undefined {
        if (changes.cycles.improved || changes.bytes.improved) {
            // Upload after a delay since the new data isn't needed right away for the web service
            // Note: Solved count is handled automatically for the web service
            const uploadStatsDelayMS = 500;
            const cycles = changes.cycles.newScore;
            const bytes = changes.bytes.newScore;
            setTimeout(async () => {
                const programString = programBytes.map(byte => Shared.hexifyByte(byte)).join("");
                await fetch(
                    this.createUri<Contract.SolutionUploadRequestParameters, {}>(
                        Contract.SolutionUploadRoute,
                        { testName: puzzleTitle },
                        {}),
                    {
                        method: "POST",
                        mode: "cors",
                        body: JSON.stringify(identity<Contract.SolutionUploadRequestBody>({
                            userId,
                            solutionCycles: cycles,
                            solutionBytes: bytes,
                            program: programString,
                        })),
                    }
                );
            }, uploadStatsDelayMS);
        }

        return undefined;
    }
}

export class Sic1SteamService implements Sic1Service {
    public static solvedCountLeaderboardName = "Solved Count";

    private steamApi: SteamApi;

    constructor(steamApi: SteamApi) {
        this.steamApi = steamApi;
    }

    private static getLeaderboardName(puzzleTitle: string, focus: Focus): string {
        return `${puzzleTitle}_${focus}`;
    }

    private async updateAndGetPuzzleFriendLeaderboard(puzzleTitle: string, focus: Focus, score: number, programBytes: number[]): Promise<FriendLeaderboardEntry[]> {
        const promiseOrNull = this.steamApi.updateLeaderboardEntryAsync(Sic1SteamService.getLeaderboardName(puzzleTitle, focus), score, programBytes);
        if (promiseOrNull !== null) {
            await promiseOrNull;
        }
        return await this.getPuzzleFriendLeaderboardAsync(puzzleTitle, focus);
    }

    public async updateUserProfileAsync(userId: string, name: string): Promise<void> {
        // User profile updates are not supported on Steam
    }

    public getPuzzleStatsAsync(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData; bytes: ChartData; }> {
        // Use bundled stats cache (obviously, this won't always be up to date, but it removes any Steam dependency on the web service)
        return Promise.resolve(enrichAndAggregatePuzzleStats(statsCache.puzzleStats[puzzleTitle], cycles, bytes));
    }

    public getUserStatsAsync(userId: string, solvedCount: number): Promise<ChartData> {
        // Use bundled stats cache
        return Promise.resolve(enrichAndAggregateUserStats(statsCache.userStats, solvedCount));
    }

    public updateStatsIfNeededAsync(userId: string, puzzleTitle: string, programBytes: number[], changes: StatChanges): PuzzleFriendLeaderboardPromises {
        // For Steam leaderboards, we need to update and *then* retrieve the friend leaderboard
        const promises: Partial<PuzzleFriendLeaderboardPromises> = {};
        for (const key of ["cycles", "bytes"]) {
            const focus = key as Focus;
            promises[focus] = changes[focus].improved
                ? this.updateAndGetPuzzleFriendLeaderboard(puzzleTitle, focus, changes[focus].newScore, programBytes)
                : this.getPuzzleFriendLeaderboardAsync(puzzleTitle, focus);
        }

        // Also update the "solved count" leaderboard, if needed (after a delay)
        if (changes.solvedCount.improved) {
            const updateSolvedCountDelayMS = 1000;
            setTimeout(() => {
                // Ignore errors since we're not using the result here
                Shared.ignoreRejection(this.steamApi.updateLeaderboardEntryAsync(Sic1SteamService.solvedCountLeaderboardName, changes.solvedCount.newScore));
            }, updateSolvedCountDelayMS);
        }

        return promises as PuzzleFriendLeaderboardPromises;
    }

    public getFriendLeaderboardAsync(leaderboardName: string): Promise<FriendLeaderboardEntry[]> {
        return this.steamApi.getFriendLeaderboardAsync(Sic1SteamService.solvedCountLeaderboardName);
    }

    public getPuzzleFriendLeaderboardAsync(puzzleTitle: string, focus: Focus): Promise<FriendLeaderboardEntry[]> {
        return this.steamApi.getFriendLeaderboardAsync(Sic1SteamService.getLeaderboardName(puzzleTitle, focus));
    }
}
