import * as Firebase from "firebase-admin";
import { SolutionDocument, root } from "./shared";

// This is a tool for showing the latest submitted solutions
(async () => {
    const docs = (await root
        .orderBy("timestamp", "desc")
        .limit(process.argv.length > 2 ? parseInt(process.argv[2]) : 5)
        .get()).docs;


    docs.forEach(doc => {
        const data = doc.data() as SolutionDocument;
        console.log(`${data.timestamp.toDate().toISOString()} - ${data.userId} - ${data.testName} (${data.cyclesExecuted} cycles, ${data.memoryBytesAccessed} bytes)`);
    });
})()
    .catch((reason) => console.log(reason))
    .then(() => null);
