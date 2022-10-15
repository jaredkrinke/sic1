export interface Contact {
    name: string;
    lastName?: string;
    title?: string;
}

export const Contacts = {
    onboarding: { name: "SIC Systems Onboarding" },
    taskManagement: { name: "Automated Task Management" },

    manager: {
        name: "Jerin",
        lastName: "Kransky",
        title: "Director of Engineering",
    },
}
