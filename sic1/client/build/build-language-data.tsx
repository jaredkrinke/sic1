import { createRenderToString, enumerateLocales, outputFile } from "./shared";
import { Shared } from "../ts/shared";

// Note that English is special-cased as the default language
const locales = enumerateLocales().filter(locale => (locale !== "en"));

function getLanguageNativeName(locale: string): string {
    const render = createRenderToString(locale);
    return render(Shared.resources.languageName);
}

const languageData =
`// Automatically generated by build-language-data.ts
import en from "content/messages-compiled/en.json";

export const localeToHrefOrMessages = {
    en,
${locales.map(locale => `    "${locale}": new URL("url:../content/messages-compiled/${locale}.json", import.meta.url).href,`).join("\n")}
} as const;

export const localeToLanguageName = {
${["en", ...locales].map(locale => `    "${locale}": "${getLanguageNativeName(locale)}",`).join("\n")}
} as const;

export const localeToManualHref = {
    en: new URL("../content/html/sic1-manual.html", import.meta.url).href,
${locales.map(locale => `    "${locale}": new URL("../content/html/sic1-manual-${locale}.html", import.meta.url).href,`).join("\n")}
}
`;

outputFile("ts/language-data.ts", languageData);
