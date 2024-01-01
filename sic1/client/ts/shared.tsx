import React from "react";
import { FormattedMessage, IntlShape } from "react-intl";

export const Shared = {
    defaultSolutionName: "Untitled",
    localStoragePrefix: "sic1_",
    avoisionSolvedCountRequired: 7,
    blankImageDataUri: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
    numberedNamePattern: /(.*) [(]([1-9][0-9]*)[)]$/,

    resources: {
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
        if (existingNames.every(s => s !== name)) {
            return name;
        }

        // Otherwise, try to construct a reasonable alternative
        let baseName = name;
        const nameMatches = Shared.numberedNamePattern.exec(name);
        if (nameMatches) {
            baseName = nameMatches[1];
        }
    
        // Find existing instances
        let highestNumber = -1;
        for (const existingName of existingNames) {
            if (existingName === baseName) {
                highestNumber = Math.max(highestNumber, 0);
            } else if (existingName.startsWith(baseName)) {
                const existingNameMatches = Shared.numberedNamePattern.exec(existingName);
                if (existingNameMatches && existingNameMatches[1] === baseName) {
                    highestNumber = Math.max(highestNumber, parseInt(existingNameMatches[2]));
                }
            }
        }
    
        if (highestNumber === -1) {
            return baseName;
        } else {
            return intl.formatMessage(
                {
                    id: "templateSolutionCopy",
                    description: "Text template for new names when copying an existing solution",
                    defaultMessage: "{name} ({newNumber})",
                },
                {
                    name: baseName,
                    newNumber: highestNumber + 1,
                });
        }
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
