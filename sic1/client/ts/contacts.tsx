import React from "react";
import { Shared } from "./shared";
import { FormattedMessage } from "react-intl";

export interface Contact {
    name: React.ReactNode;
    title?: React.ReactNode;
}

export const Contacts = {
    onboarding: {
        name: <FormattedMessage
            id="contact_onboardingName"
            description="Name for the 'onboarding' contact in the story"
            defaultMessage="SIC Systems Onboarding"
            />,
    },
    taskManagement: {
        name: <FormattedMessage
            id="contact_taskManagementName"
            description="Name for the 'taskManagement' contact in the story"
            defaultMessage="Automated Task Management"
            />,
    },

    all: {
        name: <FormattedMessage
            id="contact_allName"
            description="Name for the 'all' contact in the story"
            defaultMessage="All Engineering"
            />,
    },

    badManager: {
        name: <FormattedMessage
            id="contact_badManagerName"
            description="Name for the 'badManager' contact in the story"
            defaultMessage="Don Cooper"
            />,
        title: <FormattedMessage
            id="contact_badManagerTitle"
            description="Job title for the 'badManager' contact in the story"
            defaultMessage="Senior Engineering Lead"
            />,
    },
    badManager2: {
        name: <FormattedMessage
            id="contact_badManager2Name"
            description="Name for the 'badManager2' contact in the story"
            defaultMessage="Don Cooper"
            />,
        title: <FormattedMessage
            id="contact_badManager2Title"
            description="Job title for the 'badManager2' contact in the story"
            defaultMessage="Principal Engineering Lead"
            />,
    },
    badManagerTeam: {
        name: <FormattedMessage
            id="contact_badManagerTeamName"
            description="Name for the 'badManagerTeam' contact in the story"
            defaultMessage="Don's Team"
            />,
    },
    goodManager: {
        name: <FormattedMessage
            id="contact_goodManagerName"
            description="Name for the 'goodManager' contact in the story"
            defaultMessage="Pat Miller"
            />,
        title: <FormattedMessage
            id="contact_goodManagerTitle"
            description="Job title for the 'goodManager' contact in the story"
            defaultMessage="Senior Engineering Lead"
            />,
    },
    goodManager2: {
        name: <FormattedMessage
            id="contact_goodManager2Name"
            description="Name for the 'goodManager2' contact in the story"
            defaultMessage="Pat Miller"
            />,
    },
    goodManagerTeam: {
        name: <FormattedMessage
            id="contact_goodManagerTeamName"
            description="Name for the 'goodManagerTeam' contact in the story"
            defaultMessage="Pat's Team"
            />,
    },
    skip: {
        name: <FormattedMessage
            id="contact_skipName"
            description="Name for the 'skip' contact in the story"
            defaultMessage="Rick Wagner"
            />,
        title: <FormattedMessage
            id="contact_skipTitle"
            description="Job title for the 'skip' contact in the story"
            defaultMessage="Partner Engineering Manager"
            />,
    },
    otherSkip: {
        name: <FormattedMessage
            id="contact_otherSkipName"
            description="Name for the 'otherSkip' contact in the story"
            defaultMessage="Jerin Kransky"
            />,
        title: <FormattedMessage
            id="contact_otherSkipTitle"
            description="Job title for the 'otherSkip' contact in the story"
            defaultMessage="Partner Engineering Manager"
            />,
    },
    hr: {
        name: <FormattedMessage
            id="contact_hrName"
            description="Name for the 'hr' contact in the story"
            defaultMessage="Mary Townsend"
            />,
        title: <FormattedMessage
            id="contact_hrTitle"
            description="Job title for the 'hr' contact in the story"
            defaultMessage="Human Resources"
            />,
    },
    flunky: {
        name: <FormattedMessage
            id="contact_flunkyName"
            description="Name for the 'flunky' contact in the story"
            defaultMessage="Ted Philips"
            />,
        title: <FormattedMessage
            id="contact_flunkyTitle"
            description="Job title for the 'flunky' contact in the story"
            defaultMessage="Trainee"
            />,
    },
    flunky1: {
        name: <FormattedMessage
            id="contact_flunky1Name"
            description="Name for the 'flunky1' contact in the story"
            defaultMessage="Ted Philips"
            />,
        title: <FormattedMessage
            id="contact_flunky1Title"
            description="Job title for the 'flunky1' contact in the story"
            defaultMessage="Engineer"
            />,
    },
    mentor: {
        name: <FormattedMessage
            id="contact_mentorName"
            description="Name for the 'mentor' contact in the story"
            defaultMessage="Feng Lee"
            />,
        title: <FormattedMessage
            id="contact_mentorTitle"
            description="Job title for the 'mentor' contact in the story"
            defaultMessage="Senior Engineer"
            />,
    },
    assistant: {
        name: <FormattedMessage
            id="contact_assistantName"
            description="Name for the 'assistant' contact in the story"
            defaultMessage="Jeffrey Young"
            />,
        title: <FormattedMessage
            id="contact_assistantTitle"
            description="Job title for the 'assistant' contact in the story"
            defaultMessage="Executive Assistant"
            />,
    },
    owner: {
        name: <FormattedMessage
            id="contact_ownerName"
            description="Name for the 'owner' contact in the story"
            defaultMessage="Ilano Moscato"
            />,
        title: <FormattedMessage
            id="contact_ownerTitle"
            description="Job title for the 'owner' contact in the story"
            defaultMessage="Benevolent Dictator for Life"
            />,
    },
}
