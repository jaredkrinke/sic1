/** The actual default/fallback locale, in case the "default" one doesn't match any available translations */
const defaultLocaleString = "en";

function findAdjustedLocale(adjust: (localeString: string) => string, desiredLocaleStrings: readonly string[], availableLocaleStrings: string[]): string | undefined {
    const available = Object.fromEntries(availableLocaleStrings.map(localeString => [adjust(localeString), localeString]));
    for (const desiredLocaleString of desiredLocaleStrings) {
        const adjustedLocaleString = adjust(desiredLocaleString);
        const result = available[adjustedLocaleString];
        if (result) {
            return result;
        }
    }
}

function identity(localeString: string): string {
    return localeString;
}

function useOnlyLanguageAndScript(localeString: string): string {
    try {
        const locale = new Intl.Locale(localeString);
        return (new Intl.Locale(locale.language, {
            script: locale.script,
        })).toString();
    } catch {
        return localeString;
    }
}

function useOnlyLanguage(localeString: string): string {
    try {
        const locale = new Intl.Locale(localeString);
        return (new Intl.Locale(locale.language)).toString();
    } catch {
        return localeString;
    }
}

function inferScript(localeString: string): string {
    try {
        const locale = new Intl.Locale(localeString);

        // Infer Chinese script from region, if necessary
        if (locale.language === "zh" && !locale.script && locale.region) {
            switch (locale.region) {
                case "TW":
                case "HK":
                case "MO":
                    return "zh-Hant";
                
                default:
                    return "zh-Hans";
            }
        }

        return localeString;
    } catch {
        // Don't let an error propagate, but there's nothing sensible to do here, so use the default...
        return defaultLocaleString;
    }
}

export function getBestLocale(desiredLocaleIds: readonly string[], availableLocaleIds: string[]): string {
    return findAdjustedLocale(identity, desiredLocaleIds, availableLocaleIds) // First try exact match
        ?? findAdjustedLocale(useOnlyLanguageAndScript, desiredLocaleIds.map(localeString => inferScript(localeString)), availableLocaleIds) // Then try language+script
        ?? findAdjustedLocale(useOnlyLanguage, desiredLocaleIds, availableLocaleIds) // Then try language only
        ?? defaultLocaleString; // Default to "en"
}
