// This list of achievement ids should match Steamworks app admin, stealcallmanager.cpp, and achievements.ts

export const achievements = {
    JOB_TITLE_1: { title: "Engineer",                   imageUri: (new URL('../img/i.png', import.meta.url)).href },
    JOB_TITLE_2: { title: "Engineer II",                imageUri: (new URL('../img/ii.png', import.meta.url)).href },
    JOB_TITLE_3: { title: "Senior Engineer",            imageUri: (new URL('../img/iii.png', import.meta.url)).href },
    JOB_TITLE_4: { title: "Principal Engineer",         imageUri: (new URL('../img/iv.png', import.meta.url)).href },
    JOB_TITLE_5: { title: "Partner Engineer",           imageUri: (new URL('../img/v.png', import.meta.url)).href },
    JOB_TITLE_6: { title: "Distinguished Engineer",     imageUri: (new URL('../img/vi.png', import.meta.url)).href },
    JOB_TITLE_7: { title: "Special Promotion",          imageUri: (new URL('../img/vii.png', import.meta.url)).href },
    JOB_TITLE_8: { title: "The End",                    imageUri: (new URL('../img/viii.png', import.meta.url)).href },
    TIME_LATE:   { title: "Workin' Hard",               imageUri: (new URL('../img/time-late.png', import.meta.url)).href },
    TIME_EARLY:  { title: "Up and at 'Em",              imageUri: (new URL('../img/time-early.png', import.meta.url)).href },
    OMIT_SUBLEQ: { title: "Zero Instruction Computer",  imageUri: (new URL('../img/no-subleq.png', import.meta.url)).href },
    ERASE:       { title: "Self-Destruct",              imageUri: (new URL('../img/destruct.png', import.meta.url)).href },
    AVOISION:    { title: "Master Avoider",             imageUri: (new URL('../img/avoision.png', import.meta.url)).href },
    EPILOGUE:    { title: "To Be Continued",            imageUri: (new URL('../img/epilogue.png', import.meta.url)).href },
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
