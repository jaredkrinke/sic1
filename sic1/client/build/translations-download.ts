import { readFileSync, writeFileSync } from "fs";
import { translationsZipFileName } from "./shared";

const protocol = "https";
const host = "api.crowdin.com";
const projectId = 639736;
const pollingPeriodMS = 1000;

interface BuildProjectData {
    id: number;
    status?: string;
    progress?: number;
}

interface DownloadBuildData {
    url: string;
}

async function sleepAsync(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const token = readFileSync("build/token.txt", { encoding: "utf8" });

    async function callAsync<T>(url: string, requestInit?: RequestInit): Promise<T> {
        const result = await fetch(url, {
            ...requestInit,
            headers: {
                ...(requestInit?.headers ?? {}),
                Authorization: `Bearer ${token}`,
            },
        });

        if (!result.ok) {
            throw `Fetch failed (${result.status}): ${url}`;
        }

        const data: T = (await result.json()).data;
        return data;
    }

    // Start a build
    console.log("Starting build...");
    let data = await callAsync<BuildProjectData>(`${protocol}://${host}/api/v2/projects/${projectId}/translations/builds`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            skipUntranslatedStrings: true,
        }),
    });

    const buildId = data.id;
    console.log(`Build id: ${buildId}`);

    // Wait for completion
    while (console.log(`Build progress: ${data.progress ?? "unknown"}`), data.status !== "finished") {
        await sleepAsync(pollingPeriodMS);
        data = await callAsync<BuildProjectData>(`${protocol}://${host}/api/v2/projects/${projectId}/translations/builds/${buildId}`);
    }

    // Download
    const url = (await callAsync<DownloadBuildData>(`${protocol}://${host}/api/v2/projects/${projectId}/translations/builds/${buildId}/download`)).url;

    console.log("Downloading...");
    const blob = await (await fetch(url)).blob();

    console.log("Saving to disk...");
    writeFileSync(translationsZipFileName, Buffer.from(await blob.arrayBuffer()));
})();
