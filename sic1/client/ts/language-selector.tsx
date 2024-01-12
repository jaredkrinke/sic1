import React from "react";
import { FormattedMessage } from "react-intl";
import { localeToLanguageName } from "./language-data";

const defaultLocaleValue = "_";

export interface LanguageSelectorProps {
    locale: string | undefined;
    defaultLocale: string;
    onLanguageUpdated: (locale: string) => void;
}

export class LanguageSelector extends React.Component<LanguageSelectorProps> {
    private select = React.createRef<HTMLSelectElement>();

    public render(): React.ReactNode {
        return <select
            ref={this.select}
            onChange={(event) => {
                const value = event.currentTarget.value;
                const locale: string | undefined = (value === defaultLocaleValue) ? undefined : value;
                this.props.onLanguageUpdated(locale);
            }}
            >
                <option value={defaultLocaleValue} selected={!this.props.locale}>
                    <FormattedMessage
                        id="languageDefault"
                        description="Text shown in the language selector for the default language"
                        defaultMessage="Default ({defaultLanguage})"
                        values={{ defaultLanguage: localeToLanguageName[this.props.defaultLocale] }}
                        />
                </option>
            {Object
                .entries(localeToLanguageName)
                .filter(([locale]) => (locale !== this.props.defaultLocale))
                .map(([locale, languageName]) =>
                <option
                    key={locale}
                    value={locale}
                    selected={locale === this.props.locale}
                    >
                        <FormattedMessage
                            id="languageOption"
                            description="Text shown in the language selector for each language, using its native name (e.g. 'English') and locale string (e.g. 'en')"
                            defaultMessage="{name} ({locale})"
                            values={{
                                name: languageName,
                                locale,
                            }}
                            />
                </option>
            )}
        </select>;
    }
}
