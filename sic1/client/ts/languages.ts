import { IntlConfig } from "react-intl";
import { localeToHrefOrMessages } from "./language-data";

export async function loadMessagesAsync(locale: string): Promise<IntlConfig["messages"]> {
    const hrefOrMessages: string | IntlConfig["messages"] = localeToHrefOrMessages[locale];
    if (typeof(hrefOrMessages) === "string") {
        // URL for the JSON message file; load it
        const result = await fetch(new URL(hrefOrMessages));
        if (result.ok) {
            return await result.json() as IntlConfig["messages"];
        } else {
            throw `Failed to retrieve translations for locale: ${locale}`;
        }
    } else {
        return hrefOrMessages;
    }
}
