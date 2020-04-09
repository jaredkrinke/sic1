import * as Contract from "sic1-server-contract";
import { Shared } from "./shared";
import { ChartData } from "./chart-model";

export type LeaderboardEntry = Contract.LeaderboardEntry;

const identity = <T extends unknown>(x: T) => x;

type ParameterList<T> = {[K in keyof T]: string | number | boolean | undefined | null};

interface HistogramBounds {
    min: number;
    max: number;
    bucketSize: number;
}

export class Sic1Service {
    public static readonly userNameMaxLength = Contract.UserNameMaxLength;

    private static readonly root = "https://sic1-db.netlify.app/.netlify/functions/api";
    // private static readonly root = "http://localhost:8888/.netlify/functions/api"; // Local test server
    private static readonly puzzleBucketCount = 20;
    private static readonly userBucketCount = 30;

    private static createQueryString<T>(o: ParameterList<T>): string {
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

    private static replaceParameters<T>(path: string, o: ParameterList<T>): string {
        for (const key in o) {
            const value = o[key];
            if (value !== undefined && value !== null) {
                path = path.replace(`:${key}`, encodeURIComponent(value));
            }
        }
        return path;
    }

    private static createUri<P, Q>(path: string, parameters: ParameterList<P>, query: ParameterList<Q>) {
        return Sic1Service.root
            + Sic1Service.replaceParameters(path, parameters)
            + Sic1Service.createQueryString(query);
    }

    private static calculateBounds(min: number, max: number, bucketCount: number): HistogramBounds {
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

    private static sortAndNormalizeHistogramData(data: Contract.HistogramData, bucketCount: number): Contract.HistogramData {
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

        const bounds = Sic1Service.calculateBounds(min, max, bucketCount);
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

    public static async updateUserProfileAsync(userId: string, name: string): Promise<void> {
        await fetch(
            Sic1Service.createUri<Contract.UserProfileRequestParameters, {}>(
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

    public static async getPuzzleStatsAsync(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData, bytes: ChartData }> {
        const response = await fetch(
            Sic1Service.createUri<Contract.PuzzleStatsRequestParameters, {}>(
                Contract.PuzzleStatsRoute,
                { testName: puzzleTitle },
                {}),
            {
                method: "GET",
                mode: "cors",
            }
        );

        if (response.ok) {
            const data = await response.json() as Contract.PuzzleStatsResponse;

            // Merge and normalize data
            const cyclesHistogram = Sic1Service.sortAndNormalizeHistogramData(data.cyclesExecutedBySolution.concat([{ bucketMax: cycles, count: 1 }]), Sic1Service.puzzleBucketCount);
            const bytesHistogram = Sic1Service.sortAndNormalizeHistogramData(data.memoryBytesAccessedBySolution.concat([{ bucketMax: bytes, count: 1 }]), Sic1Service.puzzleBucketCount);
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

        throw new Error("Request failed");
    }

    public static async getUserStatsAsync(userId: string): Promise<ChartData> {
        const response = await fetch(
            Sic1Service.createUri<{}, Contract.UserStatsRequestQuery>(
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
            const data = await response.json() as Contract.UserStatsResponse;
            const solutionsHistogram = Sic1Service.sortAndNormalizeHistogramData(data.solutionsByUser, Sic1Service.userBucketCount);
            return {
                histogram: solutionsHistogram,
                highlightedValue: data.userSolvedCount,
            };
        }

        throw new Error("Request failed");
    }

    public static async getLeaderboardAsync(): Promise<LeaderboardEntry[]> {
        const response = await fetch(
            Sic1Service.createUri<{}, {}>(Contract.LeaderboardRoute, {}, {}),
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

    public static async uploadSolutionAsync(userId: string, puzzleTitle: string, cycles: number, bytes: number, programBytes: number[]): Promise<void> {
        const programString = programBytes.map(byte => Shared.hexifyByte(byte)).join("");
        await fetch(
            Sic1Service.createUri<Contract.SolutionUploadRequestParameters, {}>(
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
    }
}
