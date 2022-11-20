// This list of achievement ids should match Steam app admin

export const achievements = {
    JOB_TITLE_1: { title: "Engineer",                   imageUri: (new URL('../img/i.png', import.meta.url)).href,          description: "Get promoted to Engineer." },
    JOB_TITLE_2: { title: "Engineer II",                imageUri: (new URL('../img/ii.png', import.meta.url)).href,         description: "Get promoted to Engineer II." },
    JOB_TITLE_3: { title: "Senior Engineer",            imageUri: (new URL('../img/iii.png', import.meta.url)).href,        description: "Get promoted to Senior Engineer." },
    JOB_TITLE_4: { title: "Principal Engineer",         imageUri: (new URL('../img/iv.png', import.meta.url)).href,         description: "Get promoted to Principal Engineer." },
    JOB_TITLE_5: { title: "Partner Engineer",           imageUri: (new URL('../img/v.png', import.meta.url)).href,          description: "Get promoted to Partner Engineer." },
    JOB_TITLE_6: { title: "Distinguished Engineer",     imageUri: (new URL('../img/vi.png', import.meta.url)).href,         description: "Get promoted to Distinguished Engineer." },
    JOB_TITLE_7: { title: "Special Promotion",          imageUri: (new URL('../img/vii.png', import.meta.url)).href,        description: "Get a new job title made just for you." },
    JOB_TITLE_8: { title: "The End",                    imageUri: (new URL('../img/viii.png', import.meta.url)).href,       description: "Finish the game." },
    TIME_LATE:   { title: "Workin' Hard",               imageUri: (new URL('../img/time-late.png', import.meta.url)).href,  description: "Complete a task after 9pm (21:00) local time." },
    TIME_EARLY:  { title: "Up and at 'Em",              imageUri: (new URL('../img/time-early.png', import.meta.url)).href, description: "Complete a task before 6am (06:00) local time." },
    OMIT_SUBLEQ: { title: "Zero Instruction Computer",  imageUri: (new URL('../img/no-subleq.png', import.meta.url)).href,  description: `Solve "Addition" without typing "subleq".` },
    ERASE:       { title: "Self-Destruct",              imageUri: (new URL('../img/destruct.png', import.meta.url)).href,   description: "Write a program that reads a single input and then deletes itself (sets all memory to zero), without producing output." },
    AVOISION:    { title: "Master Avoider",             imageUri: (new URL('../img/avoision.png', import.meta.url)).href,   description: "Score at least 250 points in Avoision." },
    EPILOGUE:    { title: "To Be Continued",            imageUri: (new URL('../img/epilogue.png', import.meta.url)).href,   description: "Run across an invitation from an old friend." },
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
