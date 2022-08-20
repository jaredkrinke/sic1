import { root } from "./shared";

// This is a tool for deleting specific documents

(async function() {
    try {
        const id = process.argv[2];
        await root.doc(id).delete();
        console.log(`Deleted ${id}`);
        } catch (e) {
        console.error(`Error: ${e}`);
    }
})();
