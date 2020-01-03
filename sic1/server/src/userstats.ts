import * as Firebase from "firebase-admin";
import * as Slambda from "slambda";
import * as Shared from "sic1-server-shared";
import * as fbc from "fbc";

interface UserStatsRequest {
    userId: string;
}

interface UserStatsResponse {
    distribution: Shared.Histogram;
    validatedSolutions: number;
}

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) }, "userstats")
    .firestore()
    .collection(Shared.collectionName);

export const handler = Slambda.createHandler<UserStatsRequest, UserStatsResponse>({
    method: "GET",
    parse: Slambda.parseQueryString,
    validate: Slambda.createValidator<UserStatsRequest>({
        userId: Shared.validateUserId,
    }),
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (request) => {
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
            if (userId === request.userId) {
                validatedSolutions = users[userId];
            }
        }

        return {
            distribution: Shared.createHistogram(counts, validatedSolutions),
            validatedSolutions,
        };
    },
});

