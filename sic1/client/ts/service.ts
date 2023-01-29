import * as Contract from "sic1-server-contract";
import { Shared } from "./shared";
import { ChartData, HistogramBucketDetail, HistogramBucketWithDetails, HistogramDetail } from "./chart-model";
import { steamStatsCache, webStatsCache } from "./stats-cache";
import { FriendLeaderboardEntry, SteamApi } from "./steam-api";
import { suppressUpload } from "./setup";

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

    /** Attempts to update a Steam friend leaderboard. Note that due to rate-limiting, this may immediately return null instead of a promise. */
    tryUpdateFriendLeaderboardAsync?: (leaderboardName: string, score: number, details?: number[]) => Promise<void> | null;
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

export function sortAndNormalizeHistogramData(data: Contract.HistogramData, bucketCount: number, highlightedValue?: number, removeOutliers = false): HistogramDetail {
    let outliers: HistogramBucketDetail[] | undefined = undefined;

    if (removeOutliers) {
        // Remove upper-end outliers, if necessary
        const dataCount = data.reduce((count, bucket) => (count + bucket.count), 0);
        if (dataCount > 4) {
            // First, sort
            data = data.slice().sort((a, b) => (a.bucketMax - b.bucketMax));

            // Find inter-quartile range
            const firstQuarterIndex = Math.ceil(dataCount * 1 / 4);
            const thirdQuarterIndex = Math.ceil(dataCount * 3 / 4);
            let firstQuarter: number | undefined = undefined;
            let thirdQuarter: number | undefined = undefined;
            let i = 0;
            for (const { bucketMax, count } of data) {
                i += count;
                if (firstQuarter === undefined && i >= firstQuarterIndex) {
                    firstQuarter = bucketMax;
                }
                if (thirdQuarter === undefined && i >= thirdQuarterIndex) {
                    thirdQuarter = bucketMax;
                    break;
                }
            }

            // Consider anything more than 3 * IQR above 75th percentile an outlier
            const k = 3;
            const cutoff = thirdQuarter + k * (thirdQuarter - firstQuarter);

            // Clamp to highlighted value, if provided
            const max = (highlightedValue === undefined) ? cutoff : Math.max(highlightedValue, cutoff);
            const firstOutlierIndex = data.findIndex(({ bucketMax }) => (bucketMax > max));
            if (firstOutlierIndex >= 0) {
                outliers = data.slice(firstOutlierIndex).map(({ bucketMax, count }) => ({ value: bucketMax, count }));
                data = data.slice(0, firstOutlierIndex);
            }
        }
    }

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

    // Initialize
    const bucketed: { [bucket: number]: {
        count: number,
        details: { [score: number]: number },
    } } = {};

    for (let i = 0; i < bucketCount; i++) {
        const bucket = bounds.min + (bounds.bucketSize * i);
        bucketed[bucket] = {
            count: 0,
            details: {},
        };
    }

    // Aggregate
    for (let i = 0; i < data.length; i++) {
        const score = data[i].bucketMax;
        const bucket = Math.floor((score - bounds.min) / bounds.bucketSize) * bounds.bucketSize + bounds.min;
        const bucketData = bucketed[bucket];
        const count = data[i].count;
        bucketData.count += count;

        if (count) {
            bucketData.details[score] = (bucketData.details[score] ?? 0) + count;
        }
    }

    // Project
    const buckets: HistogramBucketWithDetails[] = [];
    for (const bucketMax in bucketed) {
        const bucketData = bucketed[bucketMax];
        buckets.push({
            bucketMax: parseInt(bucketMax),
            count: bucketData.count,
            details: Object.keys(bucketData.details).sort().map(n => ({ value: parseInt(n), count: bucketData.details[n] })),
        });
    }

    return {
        buckets,
        outliers,
    };
}

function enrichAndAggregatePuzzleStats(data: Contract.PuzzleStatsResponse[], cycles: number, bytes: number): { cycles: ChartData, bytes: ChartData } {
    // Merge and normalize data
    const cyclesHistogram = sortAndNormalizeHistogramData([].concat(
        [{ bucketMax: cycles, count: 1 }],
        ...data.map(d => d.cyclesExecutedBySolution),
    ), puzzleBucketCount, cycles, true);

    const bytesHistogram = sortAndNormalizeHistogramData([].concat(
        [{ bucketMax: bytes, count: 1 }],
        ...data.map(d => d.memoryBytesAccessedBySolution),
    ), puzzleBucketCount, bytes, true);

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

function enrichAndAggregateUserStats(data: Contract.UserStatsResponse[], solvedCount: number): ChartData {
    const histogram = sortAndNormalizeHistogramData([].concat(
        [{ bucketMax: solvedCount, count: 1 }],
        ...data.map(d => d.solutionsByUser),
    ), userBucketCount);

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
        if (!suppressUpload) {
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
    }

    public async getPuzzleStatsAsync(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData, bytes: ChartData }> {
        // Start with cached Steam stats, then use live web stats (falling back to the cache on failure), and finally add the new stats
        const data = [
            steamStatsCache.puzzleStats[puzzleTitle],
            webStatsCache.puzzleStats[puzzleTitle],
        ];

        return enrichAndAggregatePuzzleStats(data, cycles, bytes);
    }

    public async getUserStatsAsync(userId: string, solvedCount: number): Promise<ChartData> {
        // Start with cached Steam stats, then use live web stats (falling back to the cache on failure), and finally add the new stats
        const data = [
            steamStatsCache.userStats,
            webStatsCache.userStats,
        ];

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
        if (!suppressUpload && (changes.cycles.improved || changes.bytes.improved)) {
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
        const promiseOrNull = this.tryUpdateFriendLeaderboardAsync(Sic1SteamService.getLeaderboardName(puzzleTitle, focus), score, programBytes);
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
        return Promise.resolve(enrichAndAggregatePuzzleStats([steamStatsCache.puzzleStats[puzzleTitle], webStatsCache.puzzleStats[puzzleTitle]], cycles, bytes));
    }

    public getUserStatsAsync(userId: string, solvedCount: number): Promise<ChartData> {
        // Use bundled stats cache
        return Promise.resolve(enrichAndAggregateUserStats([steamStatsCache.userStats, webStatsCache.userStats], solvedCount));
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
                this.tryUpdateFriendLeaderboardAsync(Sic1SteamService.solvedCountLeaderboardName, changes.solvedCount.newScore);
            }, updateSolvedCountDelayMS);
        }

        return promises as PuzzleFriendLeaderboardPromises;
    }

    public tryUpdateFriendLeaderboardAsync(leaderboardName: string, score: number, details?: number[]): Promise<void> | null {
        return this.steamApi.updateLeaderboardEntryAsync(leaderboardName, score, details);
    }

    public getFriendLeaderboardAsync(leaderboardName: string): Promise<FriendLeaderboardEntry[]> {
        return this.steamApi.getFriendLeaderboardAsync(leaderboardName);
    }

    public getPuzzleFriendLeaderboardAsync(puzzleTitle: string, focus: Focus): Promise<FriendLeaderboardEntry[]> {
        return this.steamApi.getFriendLeaderboardAsync(Sic1SteamService.getLeaderboardName(puzzleTitle, focus));
    }
}
