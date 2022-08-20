import { root } from "./shared";

// This is a tool for deleting specific documents

(async function() {
    try {
        const id = process.argv[2];
        const doc = root.doc(id);
        console.log(`Document ${id} does${(await doc.get()).exists ? "" : " NOT"} exist`);
        await root.doc(id).delete();
        console.log(`Deleted ${id}`);
        } catch (e) {
        console.error(`Error: ${e}`);
    }
})();
