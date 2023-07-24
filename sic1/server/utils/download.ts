import { root } from "./shared";
import * as Firebase from "firebase-admin";

// This is a tool for downloading all V2 data into a big JSON archive, for later processing/analysis

(async function() {
    const [bin, script, dateString] = process.argv;
    const date = new Date(dateString);

    console.error(`Querying documents newer than ${date.toISOString()}...`);
    const docs = (await root
        .where("timestamp", ">=", Firebase.firestore.Timestamp.fromDate(date))
        .limit(25000)
        .get()).docs;
    
    console.error(`Retrieved ${docs.length} documents`)
    const archive: {[id: string]: any} = {};
    try {
        for (const doc of docs) {
            if (doc.exists) {
                const { id, createTime, readTime, updateTime } = doc;
        
                // TODO: Put this schema in e.g. shared.ts
                archive[id] = {
                    createTime,
                    readTime,
                    updateTime,
                    data: doc.data(),
                };
            } else {
                console.error(`Document ${doc.id} doesn't exist`)
            }
        }
    } catch (e) {
        console.error(`Error: ${e}`);
    }
    
    console.log(JSON.stringify(archive, undefined, 4));
})();
