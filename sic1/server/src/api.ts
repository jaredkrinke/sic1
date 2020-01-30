import Serverless from "serverless-http";
import Koa from "koa";
import Router from "@koa/router";
import Cors from "@koa/cors";
import BodyParser from "koa-bodyparser";
import * as Validize from "validize";
import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "fbc";

// New data model
function createUserDocumentId(userId: string): string {
    return `User_${userId}`;
}

interface UserDocument {
    solvedCount: number;
}

enum SolutionFocus {
    cyclesExecuted,
    memoryBytesAccessed,
}

function createSolutionDocumentId(userId: string, testName: string, focus: SolutionFocus): string {
    return `Puzzle_${userId}_${testName}_${SolutionFocus[focus]}`;
}

interface SolutionDocument {
    userId: string;
    testName: string;
    program: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    timestamp: Firebase.firestore.Timestamp;
}

enum Metric {
    cycles,
    bytes,
    solutions,
}

function createBucketKey(metric: Metric, value: number): string {
    return `${Metric[metric]}${value}`;
}

function createPuzzleHistogramId(testName: string) {
    return `Histogram_Puzzle_${testName}`;
}

function createUserHistogramId() {
    return "Histogram_Users";
}

interface HistogramDocument {
    [bucketKey: string]: number;
}

interface HistogramDataBucket {
    bucketMax: number;
    count: number;
}

type HistogramData = HistogramDataBucket[];

function createHistogramDataFromDocument(doc: HistogramDocument, metric: Metric): HistogramData {
    const buckets: HistogramDataBucket[] = [];
    const metricString = Metric[metric];
    for (const key in doc) {
        if (typeof(key) === "string") {
            const value = doc[key];
            if (key.startsWith(metricString) && typeof(value) === "number") {
                const bucketMax = parseInt(key.substr(metricString.length));
                buckets.push({
                    bucketMax,
                    count: doc[key],
                });
            }
        }
    }
    return buckets;
}

interface PuzzleStats {
    cyclesExecuted: HistogramData;
    memoryBytesAccessed: HistogramData;
}

interface UserStats {
    solutions: HistogramData;
}

async function getPuzzleStats(testName: string): Promise<PuzzleStats> {
    const data = (await root.doc(createPuzzleHistogramId(testName)).get()).data();
    return {
        cyclesExecuted: createHistogramDataFromDocument(data, Metric.cycles),
        memoryBytesAccessed: createHistogramDataFromDocument(data, Metric.bytes),
    };
}

interface Solution {
    userId: string;
    testName: string;
    program: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
}

function createSolutionDocumentFromSolution(solution: Solution): SolutionDocument {
    return {
        userId: solution.userId,
        testName: solution.testName,
        program: solution.program,
        cyclesExecuted: solution.cyclesExecuted,
        memoryBytesAccessed: solution.memoryBytesAccessed,
        timestamp: Firebase.firestore.Timestamp.now(),
    };
}

// TODO: update both sets of buckets in a single call to "update"
function hasProperties(o: object): boolean {
    for (let key in o) {
        return true;
    }
    return false;
}

function updateAggregationDocument(metric: Metric, oldValue: number, newValue: number, document: object): void {
    if (oldValue !== newValue) {
        document[createBucketKey(metric, oldValue)] = Firebase.firestore.FieldValue.increment(-1);
        document[createBucketKey(metric, newValue)] = Firebase.firestore.FieldValue.increment(1);
    }
}

async function updatePuzzleAggregation(testName: string, oldDocument: SolutionDocument, newDocument: SolutionDocument): Promise<void> {
    const changes = {};
    updateAggregationDocument(Metric.cycles, oldDocument.cyclesExecuted, newDocument.cyclesExecuted, changes);
    updateAggregationDocument(Metric.bytes, oldDocument.memoryBytesAccessed, newDocument.memoryBytesAccessed, changes);
    if (hasProperties(changes)) {
        await root.doc(createPuzzleHistogramId(testName)).update(changes);
    }
}

async function updateUserAndAggregation(userId: string): Promise<void> {
    const userDocumentReference = root.doc(createUserDocumentId(userId));
    const userDocument = await userDocumentReference.get();
    const oldSolvedCount = userDocument.exists ? (userDocument.data() as UserDocument).solvedCount : 0;
    const newSolvedCount = oldSolvedCount + 1;
    const changes = {};
    updateAggregationDocument(Metric.solutions, oldSolvedCount, newSolvedCount, changes);

    await Promise.all([
        userDocumentReference.update({ solvedCount: FirebaseFirestore.FieldValue.increment(1) }),
        root.doc(createUserHistogramId()).update(changes),
    ]);
}

async function updateSolutionAndAggregations(reference: FirebaseFirestore.DocumentReference, oldSolutionSnapshot: FirebaseFirestore.DocumentSnapshot, newSolution: Solution): Promise<void> {
    const newSolutionDocument = createSolutionDocumentFromSolution(newSolution);
    const oldSolutionDocument = oldSolutionSnapshot.data() as SolutionDocument;

    await Promise.all([
        // Upload solution
        reference.set(newSolutionDocument),

        // Update puzzle aggregations
        updatePuzzleAggregation(newSolution.testName, oldSolutionDocument, newSolutionDocument),
    ]);
}

async function addSolution(solution: Solution): Promise<void> {
    // Check to see if the user already solved this puzzle
    const { userId, testName } = solution;
    const cyclesFocusedSolutionReference = root.doc(createSolutionDocumentId(userId, testName, SolutionFocus.cyclesExecuted));
    const bytesFocusedSolutionReference = root.doc(createSolutionDocumentId(userId, testName, SolutionFocus.memoryBytesAccessed));

    const documents = await Promise.all([
        cyclesFocusedSolutionReference.get(),
        bytesFocusedSolutionReference.get(),
    ]);

    const cyclesFocusedSolutionDocument = documents[0];
    const bytesFocusedSolutionDocument = documents[1];

    const alreadySolved = (cyclesFocusedSolutionDocument.exists || bytesFocusedSolutionDocument.exists);

    // Check for improvement
    let updatePromises: Promise<void>[] = [];
    if (!cyclesFocusedSolutionDocument.exists || solution.cyclesExecuted < (cyclesFocusedSolutionDocument.data() as SolutionDocument).cyclesExecuted) {
        updatePromises.push(updateSolutionAndAggregations(
            cyclesFocusedSolutionReference,
            cyclesFocusedSolutionDocument,
            solution));
    }

    if (!bytesFocusedSolutionDocument.exists || solution.memoryBytesAccessed < (bytesFocusedSolutionDocument.data() as SolutionDocument).memoryBytesAccessed) {
        updatePromises.push(updateSolutionAndAggregations(
            bytesFocusedSolutionReference,
            bytesFocusedSolutionDocument,
            solution));
    }

    if (!alreadySolved) {
        updatePromises.push(updateUserAndAggregation(userId));
    }

    // Wait for all updates to complete
    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }
}

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
