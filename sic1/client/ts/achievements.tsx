// This list of achievement ids should match Steam app admin
import React from "react";
import { FormattedMessage } from "react-intl";

export const achievements = {
    JOB_TITLE_1: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_1"
            description="Display name for the JOB_TITLE_1 achievement"
            defaultMessage="Engineer"
        />,
        imageUri: (new URL('../img/i.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_1"
            description="Description of the JOB_TITLE_1 achievement"
            defaultMessage="Get promoted to Engineer."
        />,
    },
    JOB_TITLE_2: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_2"
            description="Display name for the JOB_TITLE_2 achievement"
            defaultMessage="Engineer II"
        />,
        imageUri: (new URL('../img/ii.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_2"
            description="Description of the JOB_TITLE_2 achievement"
            defaultMessage="Get promoted to Engineer II."
        />,
    },
    JOB_TITLE_3: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_3"
            description="Display name for the JOB_TITLE_3 achievement"
            defaultMessage="Senior Engineer"
        />,
        imageUri: (new URL('../img/iii.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_3"
            description="Description of the JOB_TITLE_3 achievement"
            defaultMessage="Get promoted to Senior Engineer."
        />,
    },
    JOB_TITLE_4: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_4"
            description="Display name for the JOB_TITLE_4 achievement"
            defaultMessage="Principal Engineer"
        />,
        imageUri: (new URL('../img/iv.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_4"
            description="Description of the JOB_TITLE_4 achievement"
            defaultMessage="Get promoted to Principal Engineer."
        />,
    },
    JOB_TITLE_5: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_5"
            description="Display name for the JOB_TITLE_5 achievement"
            defaultMessage="Partner Engineer"
        />,
        imageUri: (new URL('../img/v.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_5"
            description="Description of the JOB_TITLE_5 achievement"
            defaultMessage="Get promoted to Partner Engineer."
        />,
    },
    JOB_TITLE_6: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_6"
            description="Display name for the JOB_TITLE_6 achievement"
            defaultMessage="Distinguished Engineer"
        />,
        imageUri: (new URL('../img/vi.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_6"
            description="Description of the JOB_TITLE_6 achievement"
            defaultMessage="Get promoted to Distinguished Engineer."
        />,
    },
    JOB_TITLE_7: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_7"
            description="Display name for the JOB_TITLE_7 achievement"
            defaultMessage="Special Promotion"
        />,
        imageUri: (new URL('../img/vii.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_7"
            description="Description of the JOB_TITLE_7 achievement"
            defaultMessage="Get a new job title made just for you."
        />,
    },
    JOB_TITLE_8: {
        title: <FormattedMessage
            id="achievementNameJOB_TITLE_8"
            description="Display name for the JOB_TITLE_8 achievement"
            defaultMessage="Terminal Promotion"
        />,
        imageUri: (new URL('../img/viii.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionJOB_TITLE_8"
            description="Description of the JOB_TITLE_8 achievement"
            defaultMessage="Obtain the final promotion."
        />,
    },
    NEW_END: {
        title: <FormattedMessage
            id="achievementNameNEW_END"
            description="Display name for the NEW_END achievement"
            defaultMessage="To Be Continued"
        />,
        imageUri: (new URL('../img/epilogue.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionNEW_END"
            description="Description of the NEW_END achievement"
            defaultMessage="Share a true self-hosting program with an old friend."
        />,
    },
    
    TIME_LATE: {
        title: <FormattedMessage
            id="achievementNameTIME_LATE"
            description="Display name for the TIME_LATE achievement"
            defaultMessage="Workin' Hard"
        />,
        imageUri: (new URL('../img/time-late.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionTIME_LATE"
            description="Description of the TIME_LATE achievement"
            defaultMessage="Complete a task after 9pm (21:00) local time."
        />,
    },
    TIME_EARLY: {
        title: <FormattedMessage
            id="achievementNameTIME_EARLY"
            description="Display name for the TIME_EARLY achievement"
            defaultMessage="Up and at 'Em"
        />,
        imageUri: (new URL('../img/time-early.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionTIME_EARLY"
            description="Description of the TIME_EARLY achievement"
            defaultMessage="Complete a task before 6am (06:00) local time."
        />,
    },
    OMIT_SUBLEQ: {
        title: <FormattedMessage
            id="achievementNameOMIT_SUBLEQ"
            description="Display name for the OMIT_SUBLEQ achievement"
            defaultMessage="Zero Instruction Computer"
        />,
        imageUri: (new URL('../img/no-subleq.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionOMIT_SUBLEQ"
            description="Description of the OMIT_SUBLEQ achievement"
            defaultMessage={`Solve "Addition" without typing "subleq".`}
        />,
    },
    ERASE: {
        title: <FormattedMessage
            id="achievementNameERASE"
            description="Display name for the ERASE achievement"
            defaultMessage="Self-Destruct"
        />,
        imageUri: (new URL('../img/destruct.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionERASE"
            description="Description of the ERASE achievement"
            defaultMessage="Write a program that reads a single input and then deletes itself (sets all memory to zero), without producing output."
        />,
    },
    AVOISION: {
        title: <FormattedMessage
            id="achievementNameAVOISION"
            description="Display name for the AVOISION achievement"
            defaultMessage="Master Avoider"
        />,
        imageUri: (new URL('../img/avoision.png', import.meta.url)).href,
        description: <FormattedMessage
            id="achievementDescriptionAVOISION"
            description="Description of the AVOISION achievement"
            defaultMessage="Score at least 250 points in Avoision."
        />,
    },
} as const;

export type Achievement = keyof typeof achievements;

export const jobTitleAchievementIds: Achievement[] = [
    "JOB_TITLE_1",
    "JOB_TITLE_2",
    "JOB_TITLE_3",
    "JOB_TITLE_4",
    "JOB_TITLE_5",
    "JOB_TITLE_6",
    "JOB_TITLE_7",
    "JOB_TITLE_8",
];
