import { IntlShape } from "react-intl";

class LocalizedResource {
    private value: string | undefined;

    public setValue(newValue: string): void {
        this.value = newValue;
    }

    public getValue(): string {
        if (!this.value) {
            throw "Localized resources have not been initialized!";
        }
        return this.value;
    }
}

export const LocalizedResources = {
    defaultSolutionName: new LocalizedResource(),
} as const;

// TODO: If the locale can ever be changed, this function will need to be run again!
export function initializeResources(intl: IntlShape) {
    LocalizedResources.defaultSolutionName.setValue(intl.formatMessage({
        id: "solutionNameDefault",
        description: "Default name for new solution files",
        defaultMessage: "Untitled",
    }));
}
