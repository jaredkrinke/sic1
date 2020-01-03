import * as Firebase from "firebase-admin";
import * as Slambda from "slambda";
import * as Shared from "sic1-server-shared";
import * as fbc from "fbc";

const { createStringValidator } = Slambda;

interface AddResultRequest {
    testName: string;
    userId: string;
    solutionCycles: number;
    solutionBytes: number;
    program: string;
}

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "addresult")
    .firestore()
    .collection(Shared.collectionName);

function createDocumentId(userId: string, testName: string): string {
    return `${userId}_${testName}`;
}

function resultDocumentFromResult(item: AddResultRequest): Shared.ResultDocument {
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
        testName: Shared.validateTestName,
        userId: createStringValidator(/^[a-z]{15}$/),
        solutionCycles: Shared.validateCycles,
        solutionBytes: Shared.validateBytes,
        program: createStringValidator(/^[0-9a-fA-F]{2,512}$/)
    }),
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (item) => {
        await root.doc(createDocumentId(item.userId, item.testName))
            .set(resultDocumentFromResult(item));

        return {};
    },
});

