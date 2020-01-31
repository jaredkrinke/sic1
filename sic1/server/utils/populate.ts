import * as fs from "fs";
import * as Contract from "sic1-server-contract";
import * as rp from "request-promise-native"

interface ArchiveEntry {
    uri: string;
    body: string;
}

const identity = <T extends unknown>(x: T) => x;

(async () => {
    const archive: ArchiveEntry[] = JSON.parse(fs.readFileSync("archive.json", { encoding: "utf-8" })) as ArchiveEntry[];
    for (let i = 0; i < 1; i++) {
        const entry = archive[i];

        // TODO
        // await rp.post(uri, { body });

        console.log(`Uploaded index ${i}`);
    }

})()
    .catch((reason) => console.log(reason))
    .then(() => null);
