// This list of achievement ids should match Steamworks app admin, stealcallmanager.cpp, and achievements.ts
export const jobTitleAchievementIds = [
    "JOB_TITLE_1",
    "JOB_TITLE_2",
    "JOB_TITLE_3",
    "JOB_TITLE_4",
    "JOB_TITLE_5",
    "JOB_TITLE_6",
    "JOB_TITLE_7",
    "JOB_TITLE_8",
] as const;

export type Achievement = typeof jobTitleAchievementIds[number]
    | "AVOISION"
    | "ERASE"
    | "OMIT_SUBLEQ"
    | "TIME_EARLY"
    | "TIME_LATE"
;
