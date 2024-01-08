// Script for converting legacy Markdown-based mail format to localizable HTML (output should be pasted into the array in mail-story.tsx)
import { readdirSync, readFileSync } from "fs";
import { basename, join } from "path";
import { basicYamlParser } from "md2jsx";
import { marked } from "marked";

const contentDirectoryName = "content";
const markdownDirectoryName = "md";
const filePaths = readdirSync(join(contentDirectoryName, markdownDirectoryName)).map(fileName => join(contentDirectoryName, markdownDirectoryName, fileName))
    .concat("../../sic1-assembly.md");

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

// ASCII table handling (kind of an ugly hack, but it works)
const asciiTableHtml = `<table id="asciitable">
<tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th></tr>
<tr><th>30</th><td>□</td><td>□</td><td title="Code: 32, character:  "> </td><td title="Code: 33, character: !">!</td><td title="Code: 34, character: &quot;">&quot;</td><td title="Code: 35, character: #">#</td><td title="Code: 36, character: $">$</td><td title="Code: 37, character: %">%</td><td title="Code: 38, character: &amp;">&amp;</td><td title="Code: 39, character: &#39;">&#39;</td></tr>
<tr><th>40</th><td title="Code: 40, character: (">(</td><td title="Code: 41, character: )">)</td><td title="Code: 42, character: *">*</td><td title="Code: 43, character: +">+</td><td title="Code: 44, character: ,">,</td><td title="Code: 45, character: -">-</td><td title="Code: 46, character: .">.</td><td title="Code: 47, character: /">/</td><td title="Code: 48, character: 0">0</td><td title="Code: 49, character: 1">1</td></tr>      
<tr><th>50</th><td title="Code: 50, character: 2">2</td><td title="Code: 51, character: 3">3</td><td title="Code: 52, character: 4">4</td><td title="Code: 53, character: 5">5</td><td title="Code: 54, character: 6">6</td><td title="Code: 55, character: 7">7</td><td title="Code: 56, character: 8">8</td><td title="Code: 57, character: 9">9</td><td title="Code: 58, character: :">:</td><td title="Code: 59, character: ;">;</td></tr>      
<tr><th>60</th><td title="Code: 60, character: &lt;">&lt;</td><td title="Code: 61, character: =">=</td><td title="Code: 62, character: &gt;">&gt;</td><td title="Code: 63, character: ?">?</td><td title="Code: 64, character: @">@</td><td title="Code: 65, character: A">A</td><td title="Code: 66, character: B">B</td><td title="Code: 67, character: C">C</td><td title="Code: 68, character: D">D</td><td title="Code: 69, character: E">E</td></tr>
<tr><th>70</th><td title="Code: 70, character: F">F</td><td title="Code: 71, character: G">G</td><td title="Code: 72, character: H">H</td><td title="Code: 73, character: I">I</td><td title="Code: 74, character: J">J</td><td title="Code: 75, character: K">K</td><td title="Code: 76, character: L">L</td><td title="Code: 77, character: M">M</td><td title="Code: 78, character: N">N</td><td title="Code: 79, character: O">O</td></tr>
<tr><th>80</th><td title="Code: 80, character: P">P</td><td title="Code: 81, character: Q">Q</td><td title="Code: 82, character: R">R</td><td title="Code: 83, character: S">S</td><td title="Code: 84, character: T">T</td><td title="Code: 85, character: U">U</td><td title="Code: 86, character: V">V</td><td title="Code: 87, character: W">W</td><td title="Code: 88, character: X">X</td><td title="Code: 89, character: Y">Y</td></tr>
<tr><th>90</th><td title="Code: 90, character: Z">Z</td><td title="Code: 91, character: [">[</td><td title="Code: 92, character: \\">\\</td><td title="Code: 93, character: ]">]</td><td title="Code: 94, character: ^">^</td><td title="Code: 95, character: _">_</td><td title="Code: 96, character: \`">\`</td><td title="Code: 97, character: a">a</td><td title="Code: 98, character: b">b</td><td title="Code: 99, character: c">c</td></tr>
<tr><th>100</th><td title="Code: 100, character: d">d</td><td title="Code: 101, character: e">e</td><td title="Code: 102, character: f">f</td><td title="Code: 103, character: g">g</td><td title="Code: 104, character: h">h</td><td title="Code: 105, character: i">i</td><td title="Code: 106, character: j">j</td><td title="Code: 107, character: k">k</td><td title="Code: 108, character: l">l</td><td title="Code: 109, character: m">m</td></tr>
<tr><th>110</th><td title="Code: 110, character: n">n</td><td title="Code: 111, character: o">o</td><td title="Code: 112, character: p">p</td><td title="Code: 113, character: q">q</td><td title="Code: 114, character: r">r</td><td title="Code: 115, character: s">s</td><td title="Code: 116, character: t">t</td><td title="Code: 117, character: u">u</td><td title="Code: 118, character: v">v</td><td title="Code: 119, character: w">w</td></tr>
<tr><th>120</th><td title="Code: 120, character: x">x</td><td title="Code: 121, character: y">y</td><td title="Code: 122, character: z">z</td><td title="Code: 123, character: &#123;">&#123;</td><td title="Code: 124, character: |">|</td><td title="Code: 125, character: &#125;">&#125;</td><td title="Code: 126, character: ~">~</td><td>□</td><td>□</td><td>□</td></tr>
</table>`;

function replaceAsciiTable(html: string): undefined | string {
    const replaced = html.replace(asciiTableHtml, "{asciiTable}");
    return (html === replaced) ? undefined : replaced;
}

// Convert a single Markdown file
function convert(solvedCount: number, index: number, markdownWithFrontMatter: string, isMail: boolean): string {
    const { metadata, markdown } = parseFrontMatter(markdownWithFrontMatter, basicYamlParser);
    const name = `s${solvedCount}_${index}`;

    // SIC-1 Assembly Manual doesn't specify metadata, so insert it here
    if (solvedCount === 0 && index === 0) {
        metadata.from = "onboarding";
        metadata.subject = "SIC-1 Reference Manual";
        metadata.actions = ["manualInNewWindow"];
    }

    const from = `Contacts.${metadata.from}`;
    let html = marked(markdown);

    // Extract the ASCII table first, since it has a lot of escape codes
    const asciiTableReplaced = replaceAsciiTable(html);
    if (asciiTableReplaced) {
        html = asciiTableReplaced;
    }

    html = html
        .replace(/&#39;/g, "'")
        .replace(/'/g, "''")
        .replace(/\\/g, "\\\\")
        .replace(/&quot;/g, "\"")
        .replace(/\{\{from.name\}\}/g, metadata.from ? Contacts[metadata.from].name : "")
        .replace(/\{\{self.name\}\}/g, "{selfName}")
        .replace(/(<h[1-5]) id=[^>]*?>/g, "$1>")
        .replace(/`/g, "\\`")
        ;

    const jobTitleInfo = replaceJobTitles(html);
    if (jobTitleInfo) {
        html = jobTitleInfo.html;
    }

    const extra = Object.entries(metadata)
        .filter(([key]) => (key !== "from" && key !== "subject"))
        .map(([key, value]) => `\n        ${key}: ${indent(JSON.stringify(value, null, 4), "        ")},`)
        .join("");

    return `
    {
        id: "${name}",
        solvedCount: ${solvedCount},
        from: ${from},
        subject: <FormattedMessage
            id="mail${name}Subject"
            description="Subject line for story mail ${name}"
            defaultMessage="${metadata.subject}"
            />,
        create: (context) => <FormattedMessage
            id="mail${name}Content"
            description="HTML content for story mail ${name}"
            defaultMessage={\`${html}\`}${isMail ? `
            values={{ selfName: context.self.name${jobTitleInfo ? `, jobTitle: Shared.jobTitles[${jobTitleInfo.index}].title` : ""} }}`
                : (asciiTableReplaced
                    ? "\n            values={{ asciiTable }}"
                    : "")}
            />,${extra}
    },
`;
}

// Convert each Markdown file
const nameSubstitutions = {
    "sic1-assembly": "s0_0",
    "dev-environment": "s0_1",
    s0: "s0_2",
};

const solvedToIndex: string[][] = [];

for (const filePath of filePaths) {
    if (filePath.endsWith(".md")) {
        const markdown = readFileSync(filePath, { encoding: "utf8" });
        const fileNameWithoutExtension = basename(filePath).replace(/\.md$/, "");
        const isMail = /^s[0-9]+/.test(fileNameWithoutExtension);

        const name = nameSubstitutions[fileNameWithoutExtension]
            ?? (/_[0-9]+$/.test(fileNameWithoutExtension)
                ? fileNameWithoutExtension
                : `${fileNameWithoutExtension}_0`);
        
        // Add to index
        const [_, solvedCountString, indexString] = /^s([0-9]+)_([0-9]+)$/.exec(name);
        const solvedCount = parseInt(solvedCountString);
        const index = parseInt(indexString);

        if (!solvedToIndex[solvedCount]) {
            solvedToIndex[solvedCount] = [];
        }

        solvedToIndex[solvedCount][index] = convert(solvedCount, index, markdown, isMail);
    }
}

console.log("// Generated by convert-mail.ts");
console.log("export const storyMails = [");
for (let i = 0; i < solvedToIndex.length; i++) {
    console.log("    [");
    const index = solvedToIndex[i];
    for (let j = 0; j < index.length; j++) {
        const mail = index[j];
        console.log(`        ${indent(mail, "    ")}`);
    }
    console.log("    ],");
}
console.log("];");
