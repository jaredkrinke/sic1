// Script for building content (i.e. converting from Markdown to JSX templates using md2jsx)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { markdownToJSX } from "md2jsx";

const contentDirectoryName = "content";
const markdownDirectoryName = "md";
const tsxDirectoryName = "tsx";
const filePaths = readdirSync(join(contentDirectoryName, markdownDirectoryName)).map(fileName => join(contentDirectoryName, markdownDirectoryName, fileName))
    .concat("../../sic1-assembly.md");

mkdirSync(join(contentDirectoryName, tsxDirectoryName), { recursive: true });

for (const filePath of filePaths) {
    if (filePath.endsWith(".md")) {
        const markdown = readFileSync(filePath, { encoding: "utf8" });
        const tsx = markdownToJSX(markdown, { template: true });
        const outputPath = join(contentDirectoryName, tsxDirectoryName, basename(filePath).replace(/\.md$/, ".tsx"));
        writeFileSync(outputPath, tsx);
        console.log(`${filePath} => ${outputPath}`);
    }
}
