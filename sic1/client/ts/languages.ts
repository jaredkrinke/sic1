import { IntlConfig } from "react-intl";
import { localeToHrefOrMessages } from "./language-data";

export async function loadMessagesAsync(locale: string): Promise<IntlConfig["messages"]> {
    const hrefOrMessages: string | IntlConfig["messages"] = localeToHrefOrMessages[locale];
    if (typeof(hrefOrMessages) === "string") {
        // URL for the JSON message file; load it
        const result = await fetch(new URL(hrefOrMessages));
        if (result.ok) {
            // react-intl uses a slightly different format for specifying messages vs. storing them. In order to
            // support local testing using the "specification" format, do a hacky translation here
            const json = await result.json();
            const firstKey = Object.keys(json)[0];
            if (firstKey && json[firstKey]["defaultMessage"]) {
                // This appears to be the "specification" format; translate it
                return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, value["defaultMessage"] ?? value]))
            } else {
                return json as IntlConfig["messages"];
            }
        } else {
            throw `Failed to retrieve translations for locale: ${locale}`;
        }
    } else {
        return hrefOrMessages;
    }
}
