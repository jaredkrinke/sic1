import * as Firebase from "firebase-admin";
import * as Slambda from "slambda";
import * as Shared from "sic1-server-shared";
import * as fbc from "fbc";

interface TestStatsRequest {
    testName: string;
    cycles: number;
    bytes: number;
}

interface TestStatsResponse {
    cycles: Shared.Histogram;
    bytes: Shared.Histogram;
}

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "teststats")
    .firestore()
    .collection(Shared.collectionName);

export const handler = Slambda.createHandler<TestStatsRequest, TestStatsResponse>({
    method: "GET",
    parse: Slambda.parseQueryString,
    validate: Slambda.createValidator<TestStatsRequest>({
        testName: Shared.validateTestName,
        cycles: Shared.validateCycles,
        bytes: Shared.validateBytes,
    }),
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (request) => {
        const docs = (await root
            .where("testName", "==", request.testName)
            .select("solutionCycles", "solutionBytes")
            .get()).docs;

        return {
            cycles: Shared.createHistogram(docs.map((doc) => doc.get("solutionCycles") as number), request.cycles),
            bytes: Shared.createHistogram(docs.map((doc) => doc.get("solutionBytes") as number), request.bytes),
        };
    },
});

