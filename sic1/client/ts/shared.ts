export const Shared = {
    defaultName: "Bill",
    localStoragePrefix: "sic1_",

    jobTitles: [
        { title: "Trainee", minimumSolved: 0 },
        { title: "Engineer", minimumSolved: 3 },
        { title: "Engineer II", minimumSolved: 8 },
        { title: "Senior Engineer", minimumSolved: 11 },
        { title: "Principal Engineer", minimumSolved: 18 },
        { title: "Partner Engineer", minimumSolved: 26 },
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

    scrollElementIntoView: (element: Element, position: ScrollLogicalPosition = "nearest"): void =>{
        if (element && !Shared.isElementInViewport(element)) {
            element.scrollIntoView({ block: position });
        }
    },
};
