import { Shared } from "./shared";

export interface Contact {
    name: string;
    lastName?: string;
    title?: string;
}

export const Contacts = {
    onboarding: { name: "SIC Systems Onboarding" },
    taskManagement: { name: "Automated Task Management" },

    all: {
        name: "All Engineering",
    },
    badManager: {
        name: "Don",
        lastName: "Cooper",
        title: "Senior Engineering Lead",
    },
    badManager2: {
        name: "Don",
        lastName: "Cooper",
        title: "Principal Engineering Lead",
    },
    badManagerTeam: {
        name: "Don's Team",
    },
    goodManager: {
        name: "Pat",
        lastName: "Miller",
        title: "Senior Engineering Lead",
    },
    goodManager2: {
        name: "Pat",
        lastName: "Miller",
    },
    goodManagerTeam: {
        name: "Pat's Team",
    },
    skip: {
        name: "Rick",
        lastName: "Wagner",
        title: "Partner Engineering Manager",
    },
    otherSkip: {
        name: "Jerin",
        lastName: "Kransky",
        title: "Partner Engineering Manager",
    },
    hr: {
        name: "Mary",
        lastName: "Townsend",
        title: "Human Resources",
    },
    flunky: {
        name: "Ted",
        lastName: "Philips",
        title: Shared.jobTitles[0].title,
    },
    flunky1: {
        name: "Ted",
        lastName: "Philips",
        title: Shared.jobTitles[1].title,
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
