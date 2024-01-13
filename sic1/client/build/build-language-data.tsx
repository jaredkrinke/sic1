import { contentDirectoryName, createRenderToString, enumerateLocales, messagesCompiledDirectoryName, outputFile } from "./shared";
import { Shared } from "../ts/shared";

const locales = enumerateLocales();

function kebabToSnake(kebabCase: string): string {
    return kebabCase.replace(/-/g, "_");
}

function getLanguageNativeName(locale: string): string {
    const render = createRenderToString(locale);
    return render(Shared.resources.languageName);
}

const languageData =
`// Automatically generated by build-language-data.ts
${locales.map(locale => `import ${kebabToSnake(locale)} from "${contentDirectoryName}/${messagesCompiledDirectoryName}/${locale}.json";`).join("\n")}

export const localeToMessages = {
${locales.map(locale => `    "${locale}": ${kebabToSnake(locale)},`).join("\n")}
} as const;

export const localeToLanguageName = {
${locales.map(locale => `    "${locale}": "${getLanguageNativeName(locale)}",`).join("\n")}
} as const;
`;

outputFile("ts/language-data.tsx", languageData);