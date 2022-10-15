import { ComponentChildren } from "preact";
import { puzzleFlatArray } from "sic1-shared";
import { Shared } from "./shared";
import { Inbox, Sic1DataManager } from "./data-manager";
import { createPuzzleCharts } from "./puzzle-list";
import { PuzzleFriendLeaderboardPromises } from "./service";
import referenceManual from "../content/tsx/sic1-assembly";
import developmentEnvironmentManual from "../content/tsx/dev-environment";
import { Contact, Contacts } from "./contacts";
import s0 from "../content/tsx/s0";
import s3 from "../content/tsx/s3";
import s8 from "../content/tsx/s8";
import s11 from "../content/tsx/s11";
import s15 from "../content/tsx/s15";
import s18 from "../content/tsx/s18";
import s23 from "../content/tsx/s23";
import s26 from "../content/tsx/s26";
import s30 from "../content/tsx/s30";

interface MailContext {
    // Mail-specific context
    from: Contact;

    // Global context
    self: Contact;
    jobTitles: typeof Shared.jobTitles,
}

interface MailData {
    subject: string;
    from: Contact;
    create: (context: MailContext) => ComponentChildren;
    unimportant?: boolean;
}

export type Mail = MailData & {
    id: string;
    isSolutionStatisticsMail: boolean; // True if this is an automated statistics mail
};

const storyMailData: (MailData[] | null)[] = [
    // Trainee
    [
        {
            from: Contacts.onboarding,
            subject: "SIC-1 Reference Manual",
            create: referenceManual,
        },
        {
            from: Contacts.onboarding,
            subject: "SIC-1 Dev. Environment",
            create: developmentEnvironmentManual,
        },
        {
            from: Contacts.manager,
            subject: "Welcome to the team!",
            create: s0,
        },
    ],
    null,
    null,
    // Engineer
    [
        {
            from: Contacts.manager,
            subject: "Training complete!",
            create: s3,
        }
    ],
    null,
    null,
    null,
    null,
    // Engineer II
    [
        {
            from: Contacts.manager,
            subject: "Great start!",
            create: s8,
        }
    ],
    null,
    null,
    // Senior Engineer
    [
        {
            from: Contacts.manager,
            subject: "Excellent work!",
            create: s11,
        }
    ],
    null,
    null,
    null,
    // Principal Engineer
    [
        {
            from: Contacts.manager,
            subject: "Wow!",
            create: s15,
        }
    ],
    null,
    null,
    // Partner Engineer
    [
        {
            from: Contacts.manager,
            subject: "A well-deserved promotion",
            create: s18,
        }
    ],
    null,
    null,
    null,
    null,
    // Distinguished Engineer
    [
        {
            from: Contacts.manager,
            subject: "Amazing!",
            create: s23,
        }
    ],
    null,
    null,
    // Technical Fellow
    [
        {
            from: Contacts.manager,
            subject: "A special promotion",
            create: s26,
        }
    ],
    null,
    null,
    null,
    // Technical Fellow Emeritus
    [
        {
            from: Contacts.manager,
            subject: "Unbelievable work!",
            create: s30,
        }
    ],
];

// Session stats: these are stats that are shown in "task completed" mails. They override the "best" results from
// localStorage with the latest results from this session.
const puzzleTitleToSessionStats: {
    [title: string]: {
        cycles: number,
        bytes: number,

        // Also support overriding the friend leaderboard loading promises to support the "update+retrieve" scenario
        leaderboardPromises?: PuzzleFriendLeaderboardPromises,
    }
} = {};

export function updateSessionStats(puzzleTitle: string, cycles: number, bytes: number, leaderboardPromises?: PuzzleFriendLeaderboardPromises): void {
    puzzleTitleToSessionStats[puzzleTitle] = { cycles, bytes, leaderboardPromises };
}

const puzzleMails: Mail[] = [];
for (const puzzle of puzzleFlatArray) {
    puzzleMails.push({
        id: puzzle.title,
        isSolutionStatisticsMail: true,
        
        from: Contacts.taskManagement,
        subject: `RE: ${puzzle.title}`,
        unimportant: true,
        create: () => {
            const title = puzzle.title;
            let stats = puzzleTitleToSessionStats[title];
            if (!stats) {
                // No new stats during this session; default to saved stats
                const puzzleData = Sic1DataManager.getPuzzleData(title);
                stats = { cycles: puzzleData.solutionCycles, bytes: puzzleData.solutionBytes };
            }

            const { cycles, bytes, leaderboardPromises } = stats;
            return <>
                <p>Well done! Your program produced the correct output. Thanks for your contribution to SIC Systems!</p>
                {(cycles && bytes)
                    ? <>
                        <p>Here are performance statistics of your program (as compared to others' programs):</p>
                        {createPuzzleCharts(title, cycles, bytes, leaderboardPromises)}
                    </>
                    : null
                }
            </>;
        },
    });
}

const idToMail: Record<string, Mail> = {};

function getIdForStoryMail(solvedCount: number, index: number): string {
    return `s${solvedCount}_${index}`;
}

// Story mails are advanced solely based on solvedCount
const storyMails: (Mail[] | null)[] = [];
for (let i = 0; i < storyMailData.length; i++) {
    const mailList = storyMailData[i];
    if (mailList) {
        storyMails[i] = [];
        for (let j = 0; j < mailList.length; j++) {
            const mailData = mailList[j];
            const id = getIdForStoryMail(i, j);
            const mail = {
                id,
                isSolutionStatisticsMail: false,
                ...mailData,
            };

            idToMail[id] = mail;
            storyMails[i][j] = mail;
        }
    }
}

// Puzzle mails are added once the relevant puzzle is solved
for (let i = 0; i < puzzleMails.length; i++) {
    const puzzleMail = puzzleMails[i];
    idToMail[puzzleMail.id] = puzzleMail;
}

// Helpers for looking up mail ids in an existing Inbox
export const mails = idToMail;

type InboxIds = { [id: string]: boolean };

function getInboxIds(inbox: Inbox): InboxIds {
    const inboxIds: { [id: string]: boolean } = {};
    for (const { id } of inbox) {
        inboxIds[id] = true;
    }
    return inboxIds;
}

// Helper for inserting missing mails
type MailOrdering = { [id: string]: number };
function insertMailInOrder(inbox: Inbox, id: string, order: MailOrdering): void {
    // Add *missing* mails in order, marked as read
    const position = order[id];
    const indexOfNextMail = inbox.findIndex(mail => (order[mail.id] > position));
    const entry = { id, read: true };
    if (indexOfNextMail < 0) {
        inbox.push(entry);
    } else {
        const nextEntry = inbox[indexOfNextMail];
        inbox.splice(indexOfNextMail, 1, entry, nextEntry);
    }
}

export function migrateInbox(): void {
    let updated = false;
    const data = Sic1DataManager.getData();
    const inbox = data.inbox ?? [];
    
    // Check for, and remove, erroneous entries
    for (let i = 0; i < inbox.length; i++) {
        const id = inbox[i].id;
        if (!mails[id]) {
            updated = true;
            inbox.splice(i, 1);
            --i;
        }
    }

    // Check for missing mails
    const inboxIds = getInboxIds(inbox);
    let missing = false;
    for (let i = 0; i < puzzleFlatArray.length; i++) {
        if (Sic1DataManager.getPuzzleData(puzzleFlatArray[i].title).solved) {
            if (!inboxIds[puzzleMails[i].id]) {
                missing = true;
            }
        }
    }

    for (let i = 0; i < storyMails.length && i <= data.solvedCount; i++) {
        const mailList = storyMails[i];
        if (mailList) {
            for (const mail of mailList) {
                if (!inboxIds[mail.id]) {
                    missing = true;
                }
            }
        }
    }

    if (missing) {
        // There are missing mails. Algorithm to insert mails in a reasonable order:
        //
        // 1. Remove story mails
        // 2. Insert any missing puzzle mails
        // 3. Add back all reached story mails, in their proper location
        updated = true;

        // Create lookup table for story mails
        const isStoryMail: { [id: string]: boolean } = {};
        for (const mailList of storyMails) {
            if (mailList) {
                for (const mail of mailList) {
                    isStoryMail[mail.id] = true;
                }
            }
        }

        // Create order for puzzle mails
        const puzzleMailNaturalOrdering: MailOrdering = {};
        for (let i = 0; i < puzzleMails.length; i++) {
            puzzleMailNaturalOrdering[puzzleMails[i].id] = i;
        }

        // Remove story mails
        for (let i = 0; i < inbox.length; i++) {
            if (isStoryMail[inbox[i].id]) {
                inbox.splice(i, 1);
                --i;
            }
        }

        // Insert missing puzzle mails, in order
        for (let i = 0; i < puzzleFlatArray.length; i++) {
            const { id } = puzzleMails[i];
            if (Sic1DataManager.getPuzzleData(puzzleFlatArray[i].title).solved) {
                if (!inboxIds[id]) {
                    insertMailInOrder(inbox, id, puzzleMailNaturalOrdering);
                }
            }
        }

        // Note the *actual* order of puzzle mails
        const puzzleMailActualOrdering: MailOrdering = {};
        for (let i = 0; i < inbox.length; i++) {
            puzzleMailActualOrdering[inbox[i].id] = i;
        }

        // Add back all reached story mails, in their proper location
        for (let i = 0; i < storyMails.length && i <= data.solvedCount; i++) {
            const mailList = storyMails[i];
            if (mailList) {
                // Find the correct position
                let position = inbox.findIndex(mail => (puzzleMailActualOrdering[mail.id] === i));
                if (position < 0) {
                    position = inbox.length;
                }

                inbox.splice(position, 0, ...mailList.map(mail => ({ id: mail.id, read: true })));
            }
        }
    }

    if (updated) {
        data.inbox = inbox;
        Sic1DataManager.saveData();
    }
}

export function addMailForPuzzle(puzzleTitle: string): void {
    const puzzleFlatArrayIndex = puzzleFlatArray.findIndex(puzzle => (puzzle.title === puzzleTitle));
    const data = Sic1DataManager.getData();
    const inbox = data.inbox!;
    const inboxIds = getInboxIds(inbox);
    let updated = false;

    // Add puzzle mail, if needed
    const puzzleMail = puzzleMails[puzzleFlatArrayIndex];
    if (!inboxIds[puzzleMail.id]) {
        updated = true;
        inbox.push({
            id: puzzleMail.id,
            read: false,
        });
    }

    // Add story mails, if needed
    const mailList = storyMails[data.solvedCount];
    if (mailList) {
        for (const mail of mailList) {
            const { id } = mail;
            if (!inboxIds[id]) {
                updated = true;
                inbox.push({ id, read: false });
            }
        }
    }

    if (updated) {
        Sic1DataManager.saveData();
    }
}

export function ensureMailRead(mail: Mail, read = true): void {
    const { id } = mail;
    const data = Sic1DataManager.getData();
    const inbox = data.inbox ?? [];
    const index = inbox.findIndex(m => m.id === id);

    if (index >= 0) {
        if (inbox[index].read !== read) {
            inbox[index].read = read;
            Sic1DataManager.saveData();
        }
    }
}

export function ensureSolutionStatsMailUnread(puzzleTitle: string): void {
    const puzzleIndex = puzzleFlatArray.findIndex(p => p.title === puzzleTitle);
    ensureMailRead(puzzleMails[puzzleIndex], false);
}

export function hasUnreadMail(): boolean {
    const { inbox } = Sic1DataManager.getData();
    return inbox.findIndex(m => !m.read) !== -1;
}
