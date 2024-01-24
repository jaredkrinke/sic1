import AdmZip from "adm-zip";
import { readFileSync } from "fs";
import { basename } from "path";
import { outputFile, translationsZipFileName } from "./shared";

const localeSubstitutions = {
    "zh-CN": "zh-Hans",
    "zh-TW": "zh-Hant",
};

const zip = new AdmZip(readFileSync(translationsZipFileName));
for (const entry of zip.getEntries()) {
    const name = basename(entry.entryName);
    const matches = /^(.*)\.json$/.exec(name);
    if (matches) {
        const rawLocale = matches[1];
        const locale = localeSubstitutions[rawLocale] ?? rawLocale;

        const originalJson = JSON.parse(entry.getData().toString()) as Record<string, { defaultMessage: string, description?: string }>;
        const json = {};
        for (const [stringId, info] of Object.entries(originalJson)) {
            const { defaultMessage } = info;
            json[stringId] = { defaultMessage };
        }

        const text = JSON.stringify(json, undefined, 4);

        outputFile(`content/messages/${locale}.json`, text, translationsZipFileName);
    }
}
