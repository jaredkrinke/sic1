import * as Firebase from "firebase-admin";
import * as Slambda from "slambda";
import * as SharedData from "shared-data";
import * as fbc from "fbc";

const { createStringValidator, createNumberValidator } = Slambda;

// TODO: Share constants across client and server
const testNameMaxLength = 200; // Note: Copied into pattern below
const solutionCyclesMax = 1000000;
const solutionBytesMax = 256;

interface TestStatsRequest {
    testName: string;
    cycles: number;
    bytes: number;
}

interface HistogramBucket {
    bucket: number;
    count: number;
}

interface Histogram {
    buckets: HistogramBucket[]
    maxCount: number;
}

interface TestStatsResponse {
    cycles: Histogram;
    bytes: Histogram;
}

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "addscore")
    .firestore()
    .collection(SharedData.collection);

// TODO: Share
interface ResultDocument {
    userId: string;
    testName: string;
    program: string;
    solutionCycles: number;
    solutionBytes: number;
    timestamp: Firebase.firestore.Timestamp;
}

interface HistogramBounds {
    min: number;
    max: number;
    bucketSize: number;
}

const bucketCount = 20;
function calculateBounds(min: number, max: number, value?: number): HistogramBounds {
    if (min < 1) {
        min = 1;
    }

    if (max < 20) {
        max = 20;
    }

    if (value !== undefined) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    // Center the results if they're not spread out very much
    if ((max - min) < 20) {
        let newMin = Math.max(1, min - 10);
        max -= (newMin - min);
        min = newMin;
    }

    return {
        min,
        max,
        bucketSize: Math.max(1, Math.ceil((max - min) / bucketCount)),
    }
}

function createHistogram(counts: number[], value: number): Histogram {
    let min = 0;
    let max = 0;
    if (counts.length > 0) {
        min = counts[0];
        max = counts[0];
        for (const count of counts) {
            min = Math.min(min, count);
            max = Math.max(max, count);
        }
    }

    const bounds = calculateBounds(min, max, value);
    let histogram = {
        buckets: [],
        maxCount: 0,
    }

    // Initialize
    let bucketed: {[bucket: number]: number} = {};
    for (let i = 0; i < bucketCount; i++) {
        const bucket = bounds.min + (bounds.bucketSize * i);
        bucketed[bucket] = 0;
    }

    // Aggregate
    for (let i = 0; i < counts.length; i++) {
        const bucket = Math.floor((counts[i] - bounds.min) / bounds.bucketSize) * bounds.bucketSize + bounds.min;
        bucketed[bucket]++;
    }

    // Project
    for (const bucket in bucketed) {
        const count = bucketed[bucket];
        histogram.buckets.push({
            bucket,
            count,
        });

        histogram.maxCount = Math.max(histogram.maxCount, count);
    }

    return histogram;
}

export const handler = Slambda.createHandler<TestStatsRequest, TestStatsResponse>({
    method: "GET",
    parse: Slambda.parseQueryString,
    validate: Slambda.createValidator<TestStatsRequest>({
        testName: createStringValidator(/^.{1,200}$/),
        cycles: createNumberValidator(1, solutionCyclesMax),
        bytes: createNumberValidator(1, solutionBytesMax),
    }),
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (request) => {
        const snapshot = await root
            .where("testName", "==", request.testName)
            .select("solutionCycles", "solutionBytes")
            .get();
        
        const docs = snapshot.docs;
        docs.map((doc) => doc.get("solutionCycles"));

        return {
            cycles: createHistogram(docs.map((doc) => doc.get("solutionCycles") as number), request.cycles),
            bytes: createHistogram(docs.map((doc) => doc.get("solutionBytes") as number), request.bytes),
        };
    },
});

