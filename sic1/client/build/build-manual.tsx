import React from "react";
import ReactDOM from "react-dom/server";
import { lstatSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { storyMails } from "../ts/mail-story";
import { MailContext } from "../ts/mail-shared";
import { IntlProvider } from "react-intl";
import { Shared } from "../ts/shared";

const contentDirectoryName = "content";
const messagesDirectoryName = join(contentDirectoryName, "messages");
const htmlDirectoryName = "html";
const htmlDirectoryPath = join(contentDirectoryName, htmlDirectoryName);

function outputFile(outputPath: string, content: string, inputPath?: string): void {
    writeFileSync(outputPath, content);
    console.log(`${inputPath ?? ""} => ${outputPath}`);
}

// Detect locales by presence of *.json files in "content/messages/" directory
const messagesFilePattern = /^(.*?)\.json$/;
function enumerateLocales(): string[] {
    const result: string[] = [];
    for (const item of readdirSync(messagesDirectoryName)) {
        const matches = messagesFilePattern.exec(item);
        if (matches) {
            result.push(matches[1]);
        }
    }

    return result;
}

const storyMailContents = [].concat(...storyMails);

for (const locale of enumerateLocales()) {
    const suffix = (locale === "en") ? "" : `-${locale}`;
    const sic1ManualPath = join(htmlDirectoryPath, `sic1-manual${suffix}.html`);
    const messages = JSON.parse(readFileSync(`content/messages-compiled/${locale}.json`, { encoding: "utf8" }));

    const render = (node: React.ReactNode): string => {
        return ReactDOM.renderToString(<IntlProvider
            locale={locale}
            messages={messages}
            {...Shared.intlProviderOptions}
            >
                {node}
            </IntlProvider>);
    }

    const content = render(["s0_0", "s0_1"].map(name => storyMailContents.find((mail) => (mail.id === name)).create({} as MailContext)));

    const sic1ManualContent = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<title>${render(Shared.resources.manualTitle)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
<style>
:root { color-scheme: light dark; }

#root {
    max-width: 50em;
    margin: auto;
    font-family: sans-serif;
}

h1, h2, h3, h4, h5 { text-transform: uppercase; }
header h1 { margin-bottom: 0; }
header p { margin-top: 0; }
header { margin-bottom: 2em; }

code { font-family: sans-serif; font-weight: bold; }
pre {
    font-size: 100%;
    padding: 0.25em;
    border: 1px solid;
}

pre code {
    font-family: monospace;
}

table, th, td {
    border: 1px solid;
    border-collapse: collapse;
    padding: 0.25em;
}

td { text-align: center; }
th:first-child { text-align: right; }

</style>
</head>
<body>
<div id="root">
<header>
${render(Shared.resources.manualHeading)}
</header>
${content}
</div>
</body>
</html>
`;

    outputFile(sic1ManualPath, sic1ManualContent);
}
