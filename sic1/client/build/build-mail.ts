// Script for building content (i.e. converting from Markdown to JSX templates using md2jsx)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { basicYamlParser, markdownToJSX } from "md2jsx";

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
