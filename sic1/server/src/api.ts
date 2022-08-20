import Serverless from "serverless-http";
import Koa from "koa";
import Router from "@koa/router";
import Cors from "@koa/cors";
import BodyParser from "koa-bodyparser";
import * as Validize from "validize";
import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "../fbc.json";
import { Puzzle, shuffleInPlace, generatePuzzleTest, puzzles, puzzleCount } from "sic1-shared";
import { AssembledProgram, Emulator } from "sic1asm";

const identity = <T extends unknown>(x: T) => x;

// Puzzle list
const puzzleSet: {[title: string]: boolean} = {};
for (const group of puzzles) {
    for (const puzzle of group.list) {
        puzzleSet[puzzle.title] = true;
    }
}

// Database integration
const collectionName = "sic1v2";
const database = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) })
    .firestore();

const root = database.collection(collectionName);

// Data model
function createUserDocumentId(userId: string): string {
    return `User_${userId}`;
}

interface UserDocument {
    name?: string;
    solvedCount: number;
}

type Partial<T> = {[key in keyof T]?: T[key]};

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

// Failed requests table
interface FailedRequest {
    uri: string;
    timestamp: Firebase.firestore.Timestamp;
    message: string;
    body?: string;
}

function createFailedRequestDocumentId(): string {
    return `Failed_${(new Date()).toISOString()}_${Math.floor(Math.random() * 100000)}`;
}

async function saveFailedRequest(context: Koa.Context, error: any): Promise<void> {
    const data: FailedRequest = {
        uri: context.request.url,
        timestamp: Firebase.firestore.Timestamp.now(),
        message: (typeof(error) === "object" && error !== null && error.message) ? error.message : ((typeof(error) === "string") ? error : "Unexpected error type"),
        body: context.request.rawBody,
    };

    const failedRequests = database.collection(`${collectionName}_Failed`);
    await failedRequests.doc(createFailedRequestDocumentId()).set(data);
}

async function updateUserProfile(userId: string, name: string, context: Koa.Context): Promise<void> {
    try {
        const doc: Partial<UserDocument> = { name };
        await root.doc(createUserDocumentId(userId)).set(doc, { merge: true });
    } catch (error) {
        await saveFailedRequest(context, error);
        throw error;
    }
}

async function getUserProfile(userId: string): Promise<Contract.UserProfileGetResponse> {
    const reference = await root.doc(createUserDocumentId(userId)).get();
    return {
        name: reference.exists ? ((reference.data() as UserDocument).name || "") : "",
    };
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
    const data = (reference.exists ? reference.data() : {}) as HistogramDocument;
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

    const histogram = (results[0].exists ? results[0].data() : {}) as HistogramDocument;
    const user = results[1].exists ? results[1].data() : {};

    return {
        solutionsByUser: createHistogramDataFromDocument(histogram, Metric.solutions),
        userSolvedCount: (user as UserDocument).solvedCount || 0,
    };
}

async function getLeaderboard(): Promise<Contract.LeaderboardReponse> {
    const results = await root
        .orderBy("solvedCount", "desc")
        .limit(10)
        .get();

    return results.docs.map(doc => doc.data() as UserDocument).map(user => ({
        name: user.name || "",
        solved: user.solvedCount,
    }));
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

// Solution validation
function getPuzzle(title: string): Puzzle {
    for (const group of puzzles) {
        for (const puzzle of group.list) {
            if (puzzle.title === title) {
                return puzzle;
            }
        }
    }

    throw new Validize.ValidationError(`Test not found: ${title}`);
}

function verifyProgram(inputs: number[], expectedOutputs: number[], program: AssembledProgram, maxCyclesExecuted: number, maxMemoryBytesAccessed: number): void {
    let inputIndex = 0;
    let outputIndex = 0;

    let correct = true;
    let errorContext = "";
    const emulator = new Emulator(program, {
        readInput: () => inputs[inputIndex++],
        writeOutput: n => {
            const expected = expectedOutputs[outputIndex++];
            if (n !== expected) {
                correct = false;
                if (errorContext === "") {
                    errorContext = `expected ${expected} but got ${n} instead`;
                }
            }
        },
    });

    while (correct && outputIndex < expectedOutputs.length && emulator.getCyclesExecuted() <= maxCyclesExecuted && emulator.getMemoryBytesAccessed() <= maxMemoryBytesAccessed) {
        emulator.step();
    }

    if (emulator.getCyclesExecuted() > maxCyclesExecuted || emulator.getMemoryBytesAccessed() > maxMemoryBytesAccessed) {
        throw new Validize.ValidationError(`Execution did not complete within ${maxCyclesExecuted} cycles and ${maxMemoryBytesAccessed} bytes`);
    }

    if (!correct) {
        throw new Validize.ValidationError(`Incorrect output produced (${errorContext})`);
    }
}

const verificationMaxCycles = 100000;
function verifySolution(solution: Solution): void {
    const puzzle = getPuzzle(solution.testName);
    const test = generatePuzzleTest(puzzle);
    const bytes: number[] = [];
    for (let i = 0; i < solution.program.length; i += 2) {
        bytes.push(parseInt(solution.program.substr(i, 2), 16));
    }

    const program: AssembledProgram = {
        bytes,
        sourceMap: [],
        variables: [],
    };

    // Verify using standard input and supplied stats
    verifyProgram(test.testSets[0].input, test.testSets[0].output, program, solution.cyclesExecuted, solution.memoryBytesAccessed);

    // Verify using shuffled standard input (note: this ensures the order is different)
    const shuffeldStandardIO = puzzle.io.slice();
    const originalFirst = shuffeldStandardIO[0];
    shuffleInPlace(shuffeldStandardIO);

    // Ensure not idential to standard
    if (originalFirst === shuffeldStandardIO[0] && shuffeldStandardIO.length > 1) {
        shuffeldStandardIO[0] = shuffeldStandardIO[1];
        shuffeldStandardIO[1] = originalFirst;
    }

    verifyProgram(
        identity<number[]>([]).concat(...shuffeldStandardIO.map(a => a[0])),
        identity<number[]>([]).concat(...shuffeldStandardIO.map(a => a[1])),
        program,
        verificationMaxCycles,
        solutionBytesMax
    );

    if (puzzle.test) {
        // Verify using random input
        verifyProgram(test.testSets[1].input, test.testSets[1].output, program, verificationMaxCycles, solutionBytesMax);
    }
}

function hasProperties(o: object): boolean {
    for (let key in o) {
        return true;
    }
    return false;
}

interface HistogramDocumentChanges {
    [key: string]: number | Firebase.firestore.FieldValue;
}

function updateAggregationDocument(metric: Metric, oldValue: number | null, newValue: number, document: HistogramDocumentChanges): void {
    if (oldValue !== newValue) {
        if (typeof(oldValue) === "number" && oldValue > 0) {
            document[createBucketKey(metric, oldValue)] = Firebase.firestore.FieldValue.increment(-1);
        }
        document[createBucketKey(metric, newValue)] = Firebase.firestore.FieldValue.increment(1);
    }
}

async function updatePuzzleAggregation(testName: string, oldDocument: SolutionDocument | null, newDocument: SolutionDocument): Promise<void> {
    const changes: HistogramDocumentChanges = {};
    updateAggregationDocument(Metric.cycles, oldDocument ? oldDocument.cyclesExecuted : null, newDocument.cyclesExecuted, changes);
    updateAggregationDocument(Metric.bytes, oldDocument ? oldDocument.memoryBytesAccessed : null, newDocument.memoryBytesAccessed, changes);
    if (hasProperties(changes)) {
        await root.doc(createPuzzleHistogramId(testName)).set(changes, { merge: true });
    }
}

async function updateUserAndAggregation(userId: string): Promise<void> {
    const userDocumentReference = root.doc(createUserDocumentId(userId));
    const userDocument = await userDocumentReference.get();

    // Ensure the new count doesn't go above the actual number of puzzles (this is due to various bugs and changes that
    // have accumulated. Namely, I removed solutions that were incorrect, but didn't decrease the user's solvedCount
    // because there's really no obvious way for them to then know which solutions were retroactively decided to be
    // incorrect. Instead, I gave them a pass, but need to ensure this doesn't mean that if they *do* solve them in
    // the future, we don't increment their solvedCount past the limit.
    const oldSolvedCount = userDocument.exists ? (userDocument.data() as UserDocument).solvedCount : null;
    const newSolvedCount = Math.min(puzzleCount, (typeof(oldSolvedCount) === "number" && !isNaN(oldSolvedCount)) ? oldSolvedCount + 1 : 1);
    if (newSolvedCount !== oldSolvedCount) {
        const changes: HistogramDocumentChanges = {};
        updateAggregationDocument(Metric.solutions, oldSolvedCount, newSolvedCount, changes);

        await Promise.all([
            userDocumentReference.set({ solvedCount: Firebase.firestore.FieldValue.increment(1) }, { merge: true }),
            root.doc(createUserHistogramId()).set(changes, { merge: true }),
        ]);
    }
}

async function updateSolutionAndAggregations(reference: Firebase.firestore.DocumentReference, oldSolutionSnapshot: Firebase.firestore.DocumentSnapshot, newSolution: Solution): Promise<void> {
    const newSolutionDocument = createSolutionDocumentFromSolution(newSolution);

    await Promise.all([
        // Upload solution
        reference.set(newSolutionDocument),

        // Update puzzle aggregations
        updatePuzzleAggregation(newSolution.testName, oldSolutionSnapshot.exists ? (oldSolutionSnapshot.data() as SolutionDocument) : null, newSolutionDocument),
    ]);
}

async function addSolution(solution: Solution, context: Koa.Context): Promise<void> {
    try {
        // Verify the solution and stats first
        verifySolution(solution);

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
    } catch (error) {
        await saveFailedRequest(context, error);
        throw error;
    }
}

// TODO: Share constants across client and server
const testNameMaxLength = 200; // TODO: move into pattern below
const solutionBytesMax = 256;

// Request handlers
const validateUserId = Validize.createStringValidator(/^[a-z]{15}$/);
const validateUserName = Validize.createStringValidator(new RegExp(`^.{0,${Contract.UserNameMaxLength}}$`));
const validateTestName = Validize.createStringValidator(/^.{1,200}$/);
const validateCycles = Validize.createIntegerValidator(1, verificationMaxCycles);
const validateBytes = Validize.createIntegerValidator(1, solutionBytesMax);

const router = new Router();
router.prefix("/.netlify/functions/api");

// User profile
router.get(Contract.UserProfileRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.UserProfileRequestParameters>({ userId: validateUserId }),
    process: (request) => getUserProfile(request.parameters.userId),
}));

router.put(Contract.UserProfileRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.UserProfileRequestParameters>({ userId: validateUserId }),
    validateBody: Validize.createValidator<Contract.UserProfilePutRequestBody>({ name: validateUserName }),
    process: (request, context) => updateUserProfile(request.parameters.userId, request.body.name, context),
}));

// User stats
router.get(Contract.UserStatsRoute, Validize.handle({
    validateQuery: Validize.createValidator<Contract.UserStatsRequestQuery>({ userId: validateUserId }),
    process: (request) => getUserStats(request.query.userId),
}));

router.get(Contract.LeaderboardRoute, Validize.handle({
    process: () => getLeaderboard(),
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
    process: (request, context) => addSolution({
        userId: request.body.userId,
        testName: request.parameters.testName,
        program: request.body.program,
        cyclesExecuted: request.body.solutionCycles,
        memoryBytesAccessed: request.body.solutionBytes,
    }, context),
}));

// Set up app and handler
const app = new Koa();
app.use(Cors());
app.use(BodyParser({ extendTypes: { json: [ "text/plain" ] } }));
app.use(router.routes());
// app.use(router.allowedMethods());

export const handler = Serverless(app);
