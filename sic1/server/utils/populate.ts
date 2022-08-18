import * as fs from "fs";
import * as Contract from "sic1-server-contract";
import * as rp from "request-promise-native"

// This is the "upload" part of an old tool which uploads V1 data to V2 using the live API (throttled)

interface ArchiveEntry {
    uri: string;
    body: string;
}

const identity = <T extends unknown>(x: T) => x;
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const archive: ArchiveEntry[] = JSON.parse(fs.readFileSync("archive.json", { encoding: "utf-8" })) as ArchiveEntry[];
    for (let i = 0; i < archive.length; i++) {
        const entry = archive[i];

        await rp.post(entry.uri, { body: JSON.parse(entry.body), json: true });
        console.log(`Uploaded index ${i}`);

        // Throttle to 1 every 2 seconds (limit is ~1/sec)
        await delay(2000);
    }

})()
    .catch((reason) => console.log(reason))
    .then(() => null);
