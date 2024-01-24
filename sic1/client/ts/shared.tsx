import React from "react";
import { FormattedMessage, IntlShape } from "react-intl";

export class CoalescedFunction {
    private scheduled = false;
    private resolves: (() => void)[] = [];
    private rejects: ((reason?: any) => void)[] = [];

    constructor(private readonly f: () => void | undefined, private readonly delay: number) {
    }

    public runAsync(): Promise<void> {
        if (this.f && !this.scheduled) {
            this.scheduled = true;
            setTimeout(() => {
                this.scheduled = false;
                try {
                    this.f();
                    for (const resolve of this.resolves) {
                        resolve();
                    }
                } catch (e) {
                    for (const reject of this.rejects) {
                        reject(e);
                    }
                } finally {
                    this.resolves.length = 0;
                    this.rejects.length = 0;
                }
            }, this.delay);
        }

        return new Promise<void>((resolve, reject) => {
            this.resolves.push(resolve);
            this.rejects.push(reject);
        });
    }
}

export const Shared = {
    localStoragePrefix: "sic1_",
    avoisionSolvedCountRequired: 7,
    blankImageDataUri: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",

    intlProviderOptions: {
        defaultLocale: "en",
        defaultRichTextElements: {
            h1: c => <h1>{c}</h1>,
            h3: c => <h3>{c}</h3>,
            p: c => <p>{c}</p>,
            strong: c => <strong>{c}</strong>,
            em: c => <em>{c}</em>,
            pre: c => <pre>{c}</pre>,
            code: c => <code>{c}</code>,
            cap: c => <span className="caps">{c}</span>,
            ol: c => <ol>{c}</ol>,
            ul: c => <ul>{c}</ul>,
            li: c => <li>{c}</li>,
        },
    },

    resources: {
        cancel: <FormattedMessage
            id="buttonCancel"
            description="Text shown on various 'cancel' buttons when discarding changes to settings"
            defaultMessage="Cancel"
            />,
        headerIOIn: <FormattedMessage
            id="headerInputIn"
            description="Column heading for the IO table, for input (note: this string should be as short as possible)"
            defaultMessage="In"
            />,
        headerIOOut: <FormattedMessage
            id="headerIOOutput"
            description="Column heading for the IO table, for output, when no expected output is prescribed, i.e. in Sandbox Mode (note: this string should be as short as possible)"
            defaultMessage="Out"
            />,
        
        // This FormattedMessage isn't actually displayed anywhere, but is used to obtain the native names of languages,
        // for use in the language selector
        languageName: <FormattedMessage
            id="languageName"
            description="The name of the language being translated, in that language (using Title Case where appropriate), used for the language selection dropdown--but note that a full rebuild of the game is required for this string (only) to take effect"
            defaultMessage="English"
            />,

        manualTitle: <FormattedMessage
            id="manualTitle"
            description="Page title for the HTML/printable manual"
            defaultMessage="SIC-1 Manual"
            />,
        manualHeading: <FormattedMessage
            id="manualHeading"
            description="Markup shown at the top of the printable/HTML manual"
            defaultMessage="<h1>SIC-1 Reference Manual</h1><p>(C) 1979 - 1980 SIC Systems, Inc.</p>"
            />,
        loading: <FormattedMessage
            id="loading"
            description="Text to show while a portion of the UI is loading"
            defaultMessage="(loading...)"
            />,
        loadFailed: <FormattedMessage
            id="loadFailed"
            description="Text to show when an asynchronous load of a UI component failed"
            defaultMessage="(load failed)"
            />,
        saveChanges: <FormattedMessage
            id="buttonSaveChanges"
            description="Text shown on multiple 'save changes' buttons when editing settings"
            defaultMessage="Save Changes"
            />,
        taskStatistics: <FormattedMessage
            id="textTaskStatistics"
            description="Markup introducing task statistic charts for completed tasks"
            defaultMessage="Here are performance statistics of your program (as compared to others' programs):"
            />,
        taskStatusIncomplete: <FormattedMessage
            id="taskStatusIncomplete"
            description="Status shown for a task that has been viewed, but not yet completed"
            defaultMessage="Incomplete"
            />,
    },

    jobTitles: [
        {
            title: <FormattedMessage
                id="jobTitle0"
                description="Starting job title (during training/tutorial)"
                defaultMessage="Trainee"
                />,
            minimumSolved: 0
        },
        {
            title: <FormattedMessage
                id="jobTitle1"
                description="Initial engineering job title (after completing training/tutorial)"
                defaultMessage="Engineer"
                />,
            minimumSolved: 3
        },
        {
            title: <FormattedMessage
                id="jobTitle2"
                description="Second engineering job title"
                defaultMessage="Engineer II"
                />,
            minimumSolved: 8
        },
        {
            title: <FormattedMessage
                id="jobTitle3"
                description="Third engineering job title"
                defaultMessage="Senior Engineer"
                />,
            minimumSolved: 11
        },
        {
            title: <FormattedMessage
                id="jobTitle4"
                description="Fourth engineering job title"
                defaultMessage="Principal Engineer"
                />,
            minimumSolved: 15
        },
        {
            title: <FormattedMessage
                id="jobTitle5"
                description="Fifth engineering job title"
                defaultMessage="Partner Engineer"
                />,
            minimumSolved: 18
        },
        {
            title: <FormattedMessage
                id="jobTitle6"
                description="Sixth engineering job title (noting distinguished accomplishments)"
                defaultMessage="Distinguished Engineer"
                />,
            minimumSolved: 23
        },
        {
            title: <FormattedMessage
                id="jobTitle7"
                description="Top engineering job title"
                defaultMessage="Technical Fellow"
                />,
            minimumSolved: 26
        },
        {
            title: <FormattedMessage
                id="jobTitle8"
                description="Final job title (implying the person left the company after achieving the pinnacle of success)"
                defaultMessage="Technical Fellow Emeritus"
                />,
            minimumSolved: 30
        },
    ],

    hexifyByte: (v: number): string => {
        var str = v.toString(16);
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    },

    getJobTitleForSolvedCount: (solvedCount: number): React.ReactNode => {
        let title: React.ReactNode = "";
        for (const row of Shared.jobTitles) {
            if (solvedCount >= row.minimumSolved) {
                title = row.title;
            }
        }
        return title;
    },

    isElementInViewport: (element: Element): boolean => {
        var rect = element.getBoundingClientRect();

        return (
            rect.top >= 0
            && rect.left >= 0
            && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
            && rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    scrollElementIntoView: (element: Element, position: ScrollLogicalPosition = "nearest", force = false): void =>{
        if (element && (force || !Shared.isElementInViewport(element))) {
            element.scrollIntoView({ block: position });
        }
    },

    ignoreRejection: (promise?: Promise<any>): void => {
        if (promise) {
            promise.catch(() => {});
        }
    },

    keyToVerticalOffset: {
        ArrowUp: -1,
        ArrowDown: 1,
    } as const,

    focusFromQuery: (root: ParentNode, query: string, offset: number, wrap = false): void => {
        if (root) {
            const elements = root.querySelectorAll<HTMLButtonElement>(query);
            const activeElement = document.activeElement;
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element === activeElement) {
                    let index = i + offset;
    
                    if (wrap) {
                        if (index < 0) {
                            index = elements.length - 1;
                        } else if (index >= elements.length) {
                            index = 0;
                        }
                    }
    
                    if (index >= 0 && index < elements.length) {
                        elements[index].focus();
                    }
                    
                    break;
                }
            }
        }
    },

    createUniqueName: (intl: IntlShape, name: string, existingNames: string[]): string => {
        // If the name is already unique, just use whatever was supplied
        let number = 1;
        let newName = name;
        while (!existingNames.every(s => s !== newName)) {
            newName = intl.formatMessage(
                {
                    id: "templateSolutionDuplicate",
                    description: "Text template for new names when the desired name already exists",
                    defaultMessage: "{name} ({number})",
                },
                {
                    name,
                    number: number++,
                });
        }

        return newName;
    },

    toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
        const newSet = new Set(set);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        return newSet;
    },

    createFunctionWithMinimumPeriod(f: () => void, minimumPeriodMS): () => void {
        let lastCallTime = 0;
        return () => {
            const now = Date.now();
            if ((now - lastCallTime) >= minimumPeriodMS) {
                f();
                lastCallTime = now;
            }
        };
    }
} as const;
