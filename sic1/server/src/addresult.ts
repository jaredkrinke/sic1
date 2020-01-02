import * as Firebase from "firebase-admin";
import * as Slambda from "slambda";
import * as SharedData from "shared-data";
import * as fbc from "fbc";

const { createStringValidator, createNumberValidator } = Slambda;

// TODO: Share constants across client and server
const testNameMaxLength = 200; // Note: Copied into pattern below
const solutionCyclesMax = 1000000;
const solutionBytesMax = 256; // Note: Copied into pattern below

interface AddResultRequest {
    testName: string;
    userId: string;
    solutionCycles: number;
    solutionBytes: number;
    program: string;
}

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "addscore")
    .firestore()
    .collection(SharedData.collection);

interface ResultDocument {
    userId: string;
    testName: string;
    program: string;
    solutionCycles: number;
    solutionBytes: number;
    timestamp: Firebase.firestore.Timestamp;
}

function createDocumentId(userId: string, testName: string): string {
    return `${userId}_${testName}`;
}

function resultDocumentFromResult(item: AddResultRequest): ResultDocument {
    const { userId, testName, program, solutionCycles, solutionBytes } = item;
    return {
        userId,
        testName,
        program,
        solutionCycles,
        solutionBytes,
        timestamp: Firebase.firestore.Timestamp.now(),
    }
}

export const handler = Slambda.createHandler<AddResultRequest, {}>({
    method: "POST",
    validate: Slambda.createValidator<AddResultRequest>({
        testName: createStringValidator(/^.{1,200}$/),
        userId: createStringValidator(/^[a-z]{15}$/),
        solutionCycles: createNumberValidator(1, 1000000),
        solutionBytes: createNumberValidator(1, solutionBytesMax),
        program: createStringValidator(/^[0-9a-fA-F]{2,512}$/)
    }),
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (item) => {
        await root.doc(createDocumentId(item.userId, item.testName))
            .set(resultDocumentFromResult(item));

        return {};
    },
});

