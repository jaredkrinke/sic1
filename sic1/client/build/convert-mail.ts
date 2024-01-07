// Script for converting legacy Markdown-based mail format to localizable HTML
import { readdirSync, readFileSync } from "fs";
import { basename, join } from "path";
import { basicYamlParser } from "md2jsx";
import { marked } from "marked";

const contentDirectoryName = "content";
const markdownDirectoryName = "md";
const filePaths = readdirSync(join(contentDirectoryName, markdownDirectoryName)).map(fileName => join(contentDirectoryName, markdownDirectoryName, fileName))
//    .concat("../../sic1-assembly.md"); // TODO: Manuals

// Initialize Marked.js
marked.setOptions(marked.getDefaults());

function indent(text: string, indent: string): string {
    return text
        .split("\n")
        .join(`\n${indent}`);
}

// Copied from md2jsx
function parseFrontMatter(text: string, parseYaml: (str: string) => Record<string, any>): { metadata: Record<string, any>, markdown: string } {
    let metadata: Record<string, any> = {};
    let markdown = text;

    const frontMatterPattern = /^---\r?\n(.*?)\r?\n---(\r?\n|$)/ms;
    const matches = frontMatterPattern.exec(text);
    if (matches) {
        // Front matter found; parse it
        const frontMatter = matches[1];
        markdown = text.replace(matches[0], "");
        metadata = parseYaml(frontMatter);
    }

    return { metadata, markdown };
}

// Copied from old contacts.ts
const Contacts = {
    onboarding: { name: "SIC Systems Onboarding" },
    taskManagement: { name: "Automated Task Management" },

    all: {
        name: "All Engineering",
    },
    badManager: {
        name: "Don",
        lastName: "Cooper",
        title: "Senior Engineering Lead",
    },
    badManager2: {
        name: "Don",
        lastName: "Cooper",
        title: "Principal Engineering Lead",
    },
    badManagerTeam: {
        name: "Don's Team",
    },
    goodManager: {
        name: "Pat",
        lastName: "Miller",
        title: "Senior Engineering Lead",
    },
    goodManager2: {
        name: "Pat",
        lastName: "Miller",
    },
    goodManagerTeam: {
        name: "Pat's Team",
    },
    skip: {
        name: "Rick",
        lastName: "Wagner",
        title: "Partner Engineering Manager",
    },
    otherSkip: {
        name: "Jerin",
        lastName: "Kransky",
        title: "Partner Engineering Manager",
    },
    hr: {
        name: "Mary",
        lastName: "Townsend",
        title: "Human Resources",
    },
    flunky: {
        name: "Ted",
        lastName: "Philips",
        //title: Shared.jobTitles[0].title,
    },
    flunky1: {
        name: "Ted",
        lastName: "Philips",
        //title: Shared.jobTitles[1].title,
    },
    mentor: {
        name: "Feng",
        lastName: "Lee",
        title: "Senior Engineer",
    },
    assistant: {
        name: "Jeffrey",
        lastName: "Young",
        title: "Executive Assistant",
    },
    owner: {
        name: "Ilano",
        lastName: "Moscato",
        title: "Benevolent Dictator for Life",
    },
}

// Job title substitution
const jobTitlePattern = /\{\{jobTitles\[([0-9]+?)\].title\}\}/;

function replaceJobTitles(html: string): (undefined | { html: string, index: number }) {
    const match = jobTitlePattern.exec(html);
    if (match) {
        const [sub, number] = match;
        return {
            html: html.replace(sub, "{jobTitle}"),
            index: parseInt(number),
        }
    }
}

// Convert a single Markdown file
function convert(name: string, markdownWithFrontMatter: string): string {
    const { metadata, markdown } = parseFrontMatter(markdownWithFrontMatter, basicYamlParser);
    const from = `Contacts.${metadata.from}`;
    let html = marked(markdown)
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, "\"")
        .replace(/\{\{from.name\}\}/g, Contacts[metadata.from].name)
        .replace(/\{\{self.name\}\}/g, "{selfName}")
        .replace(/`/g, "`")
        ;

    const jobTitleInfo = replaceJobTitles(html);
    if (jobTitleInfo) {
        html = jobTitleInfo.html;
    }

    return `
    {
        id: "${name}",
        from: ${from},
        subject: <FormattedMessage
            id="mail${name}Subject"
            description="Subject line for story mail ${name}"
            defaultMessage="${metadata.subject}"
            />,
        create: (context) => <FormattedMessage
            id="mail${name}Content"
            description="HTML content for story mail ${name}"
            defaultMessage={\`${html}\`}
            values={{ selfName: context.self.name${jobTitleInfo ? `, jobTitle: Shared.jobTitles[${jobTitleInfo.index}].title` : ""} }}
            />,${metadata.actions ? `\n        actions: ${indent(JSON.stringify(metadata.actions, null, 4), "        ")},` : ""}
    },
`;
}

// Convert each Markdown file
const nameSubstitutions = {
    s0: "s0_2",
};

for (const filePath of filePaths) {
    if (filePath.endsWith(".md")) {
        if (filePath.endsWith("dev-environment.md")) continue; // TODO: Remove, eventually
        // if (!filePath.endsWith("s3_0.md")) continue; // TODO: Remove
        const markdown = readFileSync(filePath, { encoding: "utf8" });
        const fileNameWithoutExtension = basename(filePath).replace(/\.md$/, "");
        const name = nameSubstitutions[fileNameWithoutExtension]
            ?? (/_[0-9]+$/.test(fileNameWithoutExtension)
                ? fileNameWithoutExtension
                : `${fileNameWithoutExtension}_0`);

        console.log(convert(name, markdown));
    }
}
