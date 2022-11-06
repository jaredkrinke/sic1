export interface Contact {
    name: string;
    lastName?: string;
    title?: string;
}

export const Contacts = {
    onboarding: { name: "SIC Systems Onboarding" },
    taskManagement: { name: "Automated Task Management" },

    badManager: {
        name: "Don",
        lastName: "Cooper",
        title: "Principal Engineering Lead",
    },
    goodManager: {
        name: "Pat",
        lastName: "Miller",
        title: "Senior Engineering Lead",
    },
    skip: {
        name: "Rick",
        lastName: "Wagner",
        title: "Principal Engineering Manager",
    },
    otherSkip: {
        name: "Jerin",
        lastName: "Kransky",
        title: "Principal Engineering Manager",
    },
    hr: {
        name: "Mary",
        lastName: "Townsend",
        title: "Human Resources Manager",
    },
    flunky: {
        name: "Ted",
        lastName: "Philips",
        title: "Trainee",
    },
    mentor: {
        name: "Feng",
        lastName: "Lee",
        title: "Senior Engineer",
    },
    assistant: {
        name: "Jeffrey",
        lastName: "Young",
        title: "Executive Assistant",
    },
    owner: {
        name: "Ilano",
        lastName: "Moscato",
        title: "Benevolent Dictator for Life",
    },
}
