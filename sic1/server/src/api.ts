import Serverless from "serverless-http";
import Koa from "koa";
import Router from "@koa/router";
import Cors from "@koa/cors";
import BodyParser from "koa-bodyparser";
import * as Validize from "validize";
import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "fbc";

// Database integration
const collectionName = "sic1v2";
const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) })
    .firestore()
    .collection(collectionName);

// Data model
function createUserDocumentId(userId: string): string {
    return `User_${userId}`;
}

interface UserDocument {
    solvedCount?: number;
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

function createHistogramDataFromDocument(doc: HistogramDocument, metric: Metric): Contract.HistogramData {
    const buckets: Contract.HistogramDataBucket[] = [];
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

async function getPuzzleStats(testName: string): Promise<Contract.PuzzleStatsResponse> {
    const reference = await root.doc(createPuzzleHistogramId(testName)).get();
    const data = reference.exists ? reference.data() : {};
    return {
        cyclesExecutedBySolution: createHistogramDataFromDocument(data, Metric.cycles),
        memoryBytesAccessedBySolution: createHistogramDataFromDocument(data, Metric.bytes),
    };
}

async function getUserStats(userId: string): Promise<Contract.UserStatsResponse> {
    const results = await Promise.all([
        root.doc(createUserHistogramId()).get(),
        root.doc(createUserDocumentId(userId)).get(),
    ]);

    const histogram = results[0].exists ? results[0].data() : {};
    const user = results[1].exists ? results[1].data() : {};

    return {
        solutionsByUser: createHistogramDataFromDocument(histogram, Metric.solutions),
        userSolvedCount: (user as UserDocument).solvedCount || 0,
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
    const oldSolutionDocument: SolutionDocument = oldSolutionSnapshot.exists
        ? (oldSolutionSnapshot.data() as SolutionDocument)
        : {
            // Not used
            userId: "",
            testName: "",
            program: "",
            timestamp: null,

            // These are the only fields that are used below
            cyclesExecuted: 1000000,
            memoryBytesAccessed: 1000000,
        };

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

// Request handlers
const validateUserId = Validize.createStringValidator(/^[a-z]{15}$/);
const validateTestName = Validize.createStringValidator(/^.{1,200}$/);
const validateCycles = Validize.createIntegerValidator(1, solutionCyclesMax);
const validateBytes = Validize.createIntegerValidator(1, solutionBytesMax);

const router = new Router();
router.prefix("/.netlify/functions/api");

// User stats
router.get(Contract.UserStatsRoute, Validize.handle({
    validateQuery: Validize.createValidator<Contract.UserStatsRequestQuery>({ userId: validateUserId }),
    process: (request) => getUserStats(request.query.userId),
}));

// Puzzle stats
router.get(Contract.PuzzleStatsRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.PuzzleStatsRequestParameters>({ testName: validateTestName }),
    process: (request) => getPuzzleStats(request.parameters.testName),
}));

// Upload solution
router.post(Contract.SolutionUploadRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.SolutionUploadRequestParameters>({ testName: validateTestName }),
    validateBody: Validize.createValidator<Contract.SolutionUploadRequestBody>({
        userId: validateUserId,
        solutionCycles: validateCycles,
        solutionBytes: validateBytes,
        program: Validize.createStringValidator(/^[0-9a-fA-F]{2,512}$/)
    }),
    process: (request) => addSolution({
        userId: request.body.userId,
        testName: request.parameters.testName,
        program: request.body.program,
        cyclesExecuted: request.body.solutionCycles,
        memoryBytesAccessed: request.body.solutionBytes,
    }),
}));

// Set up app and handler
const app = new Koa();
app.use(Cors());
app.use(BodyParser({ extendTypes: { json: [ "text/plain" ] } }));
app.use(router.routes());
// app.use(router.allowedMethods());

export const handler = Serverless(app);
