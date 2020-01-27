import Serverless from "serverless-http";
import Koa from "koa";
import Router from "@koa/router";
import Cors from "@koa/cors";
import BodyParser from "koa-bodyparser";
import * as Validize from "validize";
import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "fbc";

// TODO: Share constants across client and server
const testNameMaxLength = 200; // Note: Copied into pattern below
const solutionCyclesMax = 1000000;
const solutionBytesMax = 256;

// Helpers
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
function calculateBounds(min: number, max: number, value: number): HistogramBounds {
    min = Math.min(min, value);
    max = Math.max(max, value);

    // Center the results if they're not spread out very much
    if ((max - min) < 20) {
        min = Math.max(0, min - 10);
    }

    return {
        min,
        max,
        bucketSize: Math.max(1, Math.ceil((max - min + 1) / bucketCount)),
    }
}

export function createHistogram(counts: number[], value: number): Contract.Histogram {
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

const validateUserId = Validize.createStringValidator(/^[a-z]{15}$/);
const validateTestName = Validize.createStringValidator(/^.{1,200}$/);
const validateCyclesWithCoercion = Validize.createIntegerValidator(1, solutionCyclesMax, true);
const validateBytesWithCoercion = Validize.createIntegerValidator(1, solutionBytesMax, true);
const validateCycles = Validize.createIntegerValidator(1, solutionCyclesMax);
const validateBytes = Validize.createIntegerValidator(1, solutionBytesMax);

// Database integration
const collectionName = "sic1";
const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "api")
    .firestore()
    .collection(collectionName);

const router = new Router();
router.prefix("/.netlify/functions/api");

// User stats
router.get(Contract.UserStatsRoute, Validize.handle({
    validateQuery: Validize.createValidator<Contract.UserStatsRequestQuery>({ userId: validateUserId }),
    process: async (request) => {
        const docs = (await root
            .select("userId")
            .get()).docs;

        // Aggregate by user
        let users = {};
        docs.forEach((doc) => {
            const userId = doc.get("userId");
            let count = users[userId] || 0;
            users[userId] = count + 1;
        });

        // Create histogram
        let counts = [];
        let validatedSolutions = 0;
        for (let userId in users) {
            counts.push(users[userId]);
            if (userId === request.query.userId) {
                validatedSolutions = users[userId];
            }
        }

        const result: Contract.UserStatsResponse = {
            distribution: createHistogram(counts, validatedSolutions),
            validatedSolutions,
        };
        return result;
    },
}));

// Puzzle stats
router.get(Contract.PuzzleStatsRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.PuzzleStatsRequestParameters>({ testName: validateTestName }),
    validateQuery: Validize.createValidator<Contract.PuzzleStatsQuery>({
        cycles: validateCyclesWithCoercion,
        bytes: validateBytesWithCoercion,
    }),
    process: async (request) => {
        const docs = (await root
            .where("testName", "==", request.parameters.testName)
            .select("solutionCycles", "solutionBytes")
            .get()).docs;

        const result: Contract.PuzzleStatsResponse = {
            cycles: createHistogram(docs.map((doc) => doc.get("solutionCycles") as number), request.query.cycles),
            bytes: createHistogram(docs.map((doc) => doc.get("solutionBytes") as number), request.query.bytes),
        };
        return result;
    },
}));

// Upload solution
function createDocumentId(userId: string, testName: string): string {
    return `${userId}_${testName}`;
}

function resultDocumentFromResult(testName: string, item: Contract.SolutionUploadRequestBody): ResultDocument {
    const { userId, program, solutionCycles, solutionBytes } = item;
    return {
        userId,
        testName,
        program,
        solutionCycles,
        solutionBytes,
        timestamp: Firebase.firestore.Timestamp.now(),
    }
}

router.post(Contract.SolutionUploadRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.SolutionUploadRequestParameters>({ testName: validateTestName }),
    validateBody: Validize.createValidator<Contract.SolutionUploadRequestBody>({
        userId: validateUserId,
        solutionCycles: validateCycles,
        solutionBytes: validateBytes,
        program: Validize.createStringValidator(/^[0-9a-fA-F]{2,512}$/)
    }),
    process: async (request) => {
        await root.doc(createDocumentId(request.body.userId, request.parameters.testName))
            .set(resultDocumentFromResult(request.parameters.testName, request.body));

        return {};
    },
}));

// Set up app and handler
const app = new Koa();
app.use(Cors());
app.use(BodyParser({ extendTypes: { json: [ "text/plain" ] } }));
app.use(router.routes());
// app.use(router.allowedMethods());

export const handler = Serverless(app);
