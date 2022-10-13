// Script for building content (i.e. converting from Markdown to JSX templates using md2jsx)
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { markdownToJSX } from "md2jsx";

const contentDirectoryName = "content";
const filePaths = readdirSync(contentDirectoryName).map(fileName => join(contentDirectoryName, fileName))
    .concat("../../sic1-assembly.md");

for (const filePath of filePaths) {
    if (filePath.endsWith(".md")) {
        const markdown = readFileSync(filePath, { encoding: "utf8" });
        const tsx = markdownToJSX(markdown, { template: true });
        const outputPath = join(contentDirectoryName, basename(filePath).replace(/\.md$/, ".tsx"));
        writeFileSync(outputPath, tsx);
        console.log(`${filePath} => ${outputPath}`);
    }
}
