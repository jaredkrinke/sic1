// Script for building content (i.e. converting from Markdown to JSX templates using md2jsx)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { basicYamlParser, markdownToJSX } from "md2jsx";
import { marked } from "marked";

function outputFile(outputPath: string, content: string, inputPath?: string): void {
    writeFileSync(outputPath, content);
    console.log(`${inputPath ?? ""} => ${outputPath}`);
}

function kebabCaseToCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (match: string, letter: string) => letter.toUpperCase());
}

const contentDirectoryName = "content";
const markdownDirectoryName = "md";
const tsxDirectoryName = "tsx";
const filePaths = readdirSync(join(contentDirectoryName, markdownDirectoryName)).map(fileName => join(contentDirectoryName, markdownDirectoryName, fileName))
    .concat("../../sic1-assembly.md");

const tsxDirectoryPath = join(contentDirectoryName, tsxDirectoryName);
mkdirSync(tsxDirectoryPath, { recursive: true });

// Create an "index.ts" file that re-exports all of the generated content
const indexFilePath = join(tsxDirectoryPath, "index.ts");
let indexFileContent = "";

// Keep track of file names for building an array of solved count-driven mails
const camelCaseNames: Record<string, boolean> = {};

// Convert each Markdown file to JSX
for (const filePath of filePaths) {
    if (filePath.endsWith(".md")) {
        const markdown = readFileSync(filePath, { encoding: "utf8" });
        const tsx = markdownToJSX(markdown, { template: true, parseFrontMatter: basicYamlParser });
        const fileNameWithoutExtension = basename(filePath).replace(/\.md$/, "");

        const outputPath = join(tsxDirectoryPath, `${fileNameWithoutExtension}.tsx`);
        outputFile(outputPath, tsx, filePath);

        // Append to index file
        const camelCaseName = kebabCaseToCamelCase(fileNameWithoutExtension);
        indexFileContent += `export { default as ${camelCaseName}, metadata as ${camelCaseName}Metadata } from "./${fileNameWithoutExtension}";\n`;

        camelCaseNames[camelCaseName] = true;
    }
}

outputFile(indexFilePath, indexFileContent);

// Export the mails as a big array
const mailFilePath = join(tsxDirectoryPath, "mail.ts");
let mailFileContent = "import * as Content from \"./index\";\n\nexport default [\n";

const mailData: (string[] | null)[] = [];
const pattern = /^s([0-9]+)(_([0-9]+))?$/;
for (const key of Object.keys(camelCaseNames)) {
    const matches = pattern.exec(key);
    if (matches) {
        const [ _entireMatch, solvedCount, _suffix, index ] = matches;
        if (!mailData[solvedCount]) {
            mailData[solvedCount] = [];
        }

        mailData[solvedCount][index ?? 0] = key;
    }
}

for (const row of mailData) {
    mailFileContent += `    ${row ? `[ ${row.map(k => `{ ...Content.${k}Metadata, create: Content.${k} }`)} ]` : "null"},\n`;
}

mailFileContent += "];\n";
outputFile(mailFilePath, mailFileContent);

// Also create an HTML manual
const htmlDirectoryName = "html";
const htmlDirectoryPath = join(contentDirectoryName, htmlDirectoryName);
const sic1ManualPath = join(htmlDirectoryPath, "sic1-manual.html");

mkdirSync(htmlDirectoryPath, { recursive: true });
marked.setOptions(marked.getDefaults());

const sic1ManualContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SIC-1 Manual</title>
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

</style>
</head>
<body>
<div id="root">
<header>
<h1>SIC-1 Reference Manual</h1>
<p>(C) 1980 SIC Systems, Inc.</p>
</header>
${marked(readFileSync("../../sic1-assembly.md", { encoding: "utf8" }))}
${marked(readFileSync("content/md/dev-environment.md", { encoding: "utf8" }).replace(/^---.*---/s, ""))}
</div>
</body>
</html>
`;

outputFile(sic1ManualPath, sic1ManualContent);
