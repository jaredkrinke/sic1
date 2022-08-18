import { root } from "./shared"

// This is a tool for downloading all V2 data into a big JSON archive, for later processing/analysis

(async function() {
    console.error("Querying documents...");
    const docs = (await root
        .limit(35000)
        .get()).docs;
    
    console.error(`Retrieved ${docs.length} documents`)
    const archive: any[] = [];
    try {
        for (const doc of docs) {
            if (doc.exists) {
                const { id, createTime, readTime, updateTime } = doc;
        
                archive.push({
                    id,
                    createTime,
                    readTime,
                    updateTime,
                    data: doc.data(),
                });
            } else {
                console.error(`Document ${doc.id} doesn't exist`)
            }
        }
    } catch (e) {
        console.error(`Error: ${e}`);
    }
    
    console.log(JSON.stringify(archive, undefined, 4));
})();
