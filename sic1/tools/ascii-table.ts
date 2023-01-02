function makeRange(min: number, max: number): number[] {
    return Array(max - min + 1).fill(0).map((_, i) => min + i);
}

function isPrintable(code: number): boolean {
    return (code >= 32 && code <= 126);
}

function escapeForHtml(str: string): string {
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("'", "&#39;")
        .replaceAll("\"", "&quot;")

        // And for JSX!
        .replaceAll("{", "&#123;")
        .replaceAll("}", "&#125;")
        ;
}

function formatCode(code: number): string {
    return isPrintable(code) ? escapeForHtml(String.fromCharCode(code)) : "\u25A1";
}

console.log(`<table id="asciitable">
<tr><th></th>${makeRange(0, 9).map(n => `<th>${n}</th>`).join("")}</tr>
${makeRange(3, 12)
    .map(tens => `<tr><th>${tens}0</th>${makeRange(0, 9)
            .map(ones => tens * 10 + ones)
            .map(code => `<td${isPrintable(code) ? ` title="Code: ${code}, character: ${formatCode(code)}"` : ""}>${formatCode(code)}</td>`)
            .join("")}</tr>`)
    .join("\n")}
</table>`);
