import * as Contract from "sic1-server-contract";
import { Shared } from "./shared";
import { ChartData } from "./chart-model";

const identity = <T extends unknown>(x: T) => x;

type ParameterList<T> = {[K in keyof T]: string | number | boolean | undefined | null};

interface HistogramBounds {
    min: number;
    max: number;
    bucketSize: number;
}

export class Sic1Service {
    // private static readonly root = "https://sic1-db.netlify.com/.netlify/functions/api";
    private static readonly root = "http://localhost:8888/.netlify/functions/api"; // Local test server
    private static readonly bucketCount = 20;

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

    private static calculateBounds(min: number, max: number): HistogramBounds {
        // Center the results if they're not spread out very much
        if ((max - min) < Sic1Service.bucketCount) {
            min = Math.max(0, min - (Sic1Service.bucketCount / 2));
        }

        return {
            min,
            max,
            bucketSize: Math.max(1, Math.ceil((max - min + 1) / Sic1Service.bucketCount)),
        }
    }

    private static sortAndNormalizeHistogramData(data: Contract.HistogramData): Contract.HistogramData {
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

        const bounds = Sic1Service.calculateBounds(min, max);
        let buckets: Contract.HistogramDataBucket[] = [];

        // Initialize
        let bucketed: {[bucket: number]: number} = {};
        for (let i = 0; i < Sic1Service.bucketCount; i++) {
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

    public static async getPuzzleStats(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData, bytes: ChartData }> {
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
            const cyclesHistogram = Sic1Service.sortAndNormalizeHistogramData(data.cyclesExecutedBySolution.concat([{ bucketMax: cycles, count: 1 }]));
            const bytesHistogram = Sic1Service.sortAndNormalizeHistogramData(data.memoryBytesAccessedBySolution.concat([{ bucketMax: bytes, count: 1 }]));
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
    }

    public static async getUserStats(userId: string): Promise<ChartData> {
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
            const solutionsHistogram = Sic1Service.sortAndNormalizeHistogramData(data.solutionsByUser);
            return {
                histogram: solutionsHistogram,
                highlightedValue: data.userSolvedCount,
            };
        }
    }

    public static async uploadSolution(userId: string, puzzleTitle: string, cycles: number, bytes: number, programBytes: number[]): Promise<void> {
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
