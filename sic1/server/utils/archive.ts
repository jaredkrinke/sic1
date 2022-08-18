import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "fbc";

// This is the "read" part of an old tool for migrating data from V1 to V2.

// V1
interface ResultDocument {
    userId: string;
    testName: string;
    program: string;
    solutionCycles: number;
    solutionBytes: number;
    timestamp: Firebase.firestore.Timestamp;
}

interface ArchiveEntry {
    uri: string;
    body: string;
}

const identity = <T extends unknown>(x: T) => x;

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) })
    .firestore()
    .collection("sic1");

(async () => {
    const docs = (await root
        // .limit(1)
        .get()).docs;

    const archive: ArchiveEntry[] = [];

    for (const doc of docs) {
        const data = doc.data() as ResultDocument;
        const uri = `http://localhost:8888/.netlify/functions/api/solutions/${encodeURIComponent(data.testName)}`;
        const body = JSON.stringify(identity<Contract.SolutionUploadRequestBody>({
            userId: data.userId,
            program: data.program,
            solutionCycles: data.solutionCycles,
            solutionBytes: data.solutionBytes,
            // Note: dropping the timestamp...
        }));

        archive.push({ uri, body });
    }

    console.log(JSON.stringify(archive));
})()
    .catch((reason) => console.log(reason))
    .then(() => null);
