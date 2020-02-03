import * as Firebase from "firebase-admin";
import * as fbc from "fbc";

interface SolutionDocument {
    userId: string;
    testName: string;
    program: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    timestamp: Firebase.firestore.Timestamp;
}

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) })
    .firestore()
    .collection("sic1v2");

(async () => {
    const docs = (await root
        .orderBy("timestamp", "desc")
        .limit(5)
        .get()).docs;


    docs.forEach(doc => {
        const data = doc.data() as SolutionDocument;
        console.log(`${data.timestamp.toDate().toISOString()} - ${data.userId} - ${data.testName} (${data.cyclesExecuted} cycles, ${data.memoryBytesAccessed} bytes)`);
    });
})()
    .catch((reason) => console.log(reason))
    .then(() => null);
