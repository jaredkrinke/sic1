import Serverless from "serverless-http";
import Koa from "koa";
import Router from "@koa/router";
import Cors from "@koa/cors";
import BodyParser from "koa-bodyparser";
import * as Validize from "validize";
import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "fbc";
import * as Shared from "sic1-server-shared";

// Database integration
const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "api")
    .firestore()
    .collection(Shared.collectionName);

const router = new Router();
router.prefix("/.netlify/functions/api");

// User stats
router.get(Contract.UserStatsRoute, Validize.handle({
    validateQuery: Validize.createValidator<Contract.UserStatsRequestQuery>({ userId: Shared.validateUserId }),
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

        return {
            distribution: Shared.createHistogram(counts, validatedSolutions),
            validatedSolutions,
        };
    },
}));

// Puzzle stats
router.get(Contract.PuzzleStatsRoute, Validize.handle({
    validateParameters: Validize.createValidator<Contract.PuzzleStatsRequestParameters>({ testName: Shared.validateTestName }),
    validateQuery: Validize.createValidator<Contract.PuzzleStatsQuery>({
        cycles: Shared.validateCycles,
        bytes: Shared.validateBytes,
    }),
    process: async (request) => {
        const docs = (await root
            .where("testName", "==", request.parameters.testName)
            .select("solutionCycles", "solutionBytes")
            .get()).docs;

        return {
            cycles: Shared.createHistogram(docs.map((doc) => doc.get("solutionCycles") as number), request.query.cycles),
            bytes: Shared.createHistogram(docs.map((doc) => doc.get("solutionBytes") as number), request.query.bytes),
        };
    },
}));

// Upload solution
function createDocumentId(userId: string, testName: string): string {
    return `${userId}_${testName}`;
}

function resultDocumentFromResult(testName: string, item: Contract.SolutionUploadRequestBody): Shared.ResultDocument {
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
    validateParameters: Validize.createValidator<Contract.SolutionUploadRequestParameters>({ testName: Shared.validateTestName }),
    validateBody: Validize.createValidator<Contract.SolutionUploadRequestBody>({
        userId: Shared.validateUserId,
        solutionCycles: Shared.validateCycles,
        solutionBytes: Shared.validateBytes,
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
