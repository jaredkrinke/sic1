import React from "react";
import ReactDOM from "react-dom/server";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { IntlConfig, IntlProvider } from "react-intl";
import { Shared } from "../ts/shared";

export const contentDirectoryName = "content";
export const messagesDirectoryName = "messages";
export const messagesCompiledDirectoryName = "messages-compiled";
export const translationsZipFileName = "translations.zip";

export function outputFile(outputPath: string, content: string, inputPath?: string): void {
    writeFileSync(outputPath, content);
    console.log(`${inputPath ?? ""} => ${outputPath}`);
}

// Detect locales by presence of *.json files in "content/messages/" directory
const messagesFilePattern = /^(.*?)\.json$/;
export function enumerateLocales(): string[] {
    const result: string[] = [];
    for (const item of readdirSync(join(contentDirectoryName, messagesDirectoryName))) {
        const matches = messagesFilePattern.exec(item);
        if (matches) {
            result.push(matches[1]);
        }
    }

    return result;
}

function loadMessages(locale: string): IntlConfig["messages"] {
    const messages = JSON.parse(readFileSync(join(contentDirectoryName, messagesCompiledDirectoryName, `${locale}.json`), { encoding: "utf8" }));
    return messages as IntlConfig["messages"];
}

export function createRenderToString(locale: string): (node: React.ReactNode) => string {
    const messages = loadMessages(locale);
    const render = (node: React.ReactNode): string => {
        return ReactDOM.renderToString(<IntlProvider
            locale={locale}
            messages={messages}
            {...Shared.intlProviderOptions}
            >
                {node}
            </IntlProvider>);
    }

    return render;
}
