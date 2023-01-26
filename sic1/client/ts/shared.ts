export const Shared = {
    defaultName: "Bill",
    defaultSolutionName: "Untitled",
    localStoragePrefix: "sic1_",
    avoisionSolvedCountRequired: 7,
    blankImageDataUri: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
    numberedNamePattern: /(.*) [(]([1-9][0-9]*)[)]$/,

    jobTitles: [
        { title: "Trainee", minimumSolved: 0 },
        { title: "Engineer", minimumSolved: 3 },
        { title: "Engineer II", minimumSolved: 8 },
        { title: "Senior Engineer", minimumSolved: 11 },
        { title: "Principal Engineer", minimumSolved: 15 },
        { title: "Partner Engineer", minimumSolved: 18 },
        { title: "Distinguished Engineer", minimumSolved: 23 },
        { title: "Technical Fellow", minimumSolved: 26 },
        { title: "Technical Fellow Emeritus", minimumSolved: 30 },
    ],

    hexifyByte: (v: number): string => {
        var str = v.toString(16);
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    },

    getJobTitleForSolvedCount: (solvedCount: number): string => {
        let title = "";
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

    createUniqueName: (name: string, existingNames: string[]): string => {
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
            return `${baseName} (${highestNumber + 1})`;
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
} as const;
