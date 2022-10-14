import { ComponentChildren } from "preact";
import { puzzleFlatArray } from "sic1-shared";
import { Shared } from "./shared";
import { Inbox, Sic1DataManager } from "./data-manager";
import { createPuzzleCharts } from "./puzzle-list";
import { PuzzleFriendLeaderboardPromises } from "./service";
import referenceManual from "../content/tsx/sic1-assembly";
import developmentEnvironmentManual from "../content/tsx/dev-environment";
import s0 from "../content/tsx/s0";
import s3 from "../content/tsx/s3";
import s8 from "../content/tsx/s8";
import s11 from "../content/tsx/s11";
import s15 from "../content/tsx/s15";
import s18 from "../content/tsx/s18";
import s23 from "../content/tsx/s23";
import s26 from "../content/tsx/s26";
import s30 from "../content/tsx/s30";

export interface Contact {
    name: string;
    lastName?: string;
    title?: string;
}

interface MailContext {
    self: Contact;
    from: Contact;
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

const contactOnboarding = { name: "SIC Systems Onboarding" };

const manager = {
    name: "Jerin",
    lastName: "Kransky",
    title: "Director of Engineering",
};

const solvedMails: (MailData[] | null)[] = [
    // Trainee
    [
        {
            from: contactOnboarding,
            subject: "SIC-1 Reference Manual",
            create: referenceManual,
        },
        {
            from: contactOnboarding,
            subject: "SIC-1 Dev. Environment",
            create: developmentEnvironmentManual,
        },
        {
            from: manager,
            subject: "Welcome to the team!",
            create: s0,
        },
    ],

    // Subleq Instruction and Output
    null,
    // Data Directive and Looping
    null,
    // First Assessment // Engineer
    [
        {
            from: manager,
            subject: "Training complete!",
            create: s3,
        }
    ],

    // Addition
    null,
    // Subtraction
    null,
    // Sign Function
    null,
    // Multiplication
    null,
    // Division // Engineer II
    [
        {
            from: manager,
            subject: "Great start!",
            create: s8,
        }
    ],

    // Sequence Sum
    null,
    // Sequence Cardinality
    null,
    // Number to Sequence // Senior Engineer
    [
        {
            from: manager,
            subject: "Excellent work!",
            create: s11,
        }
    ],

    // Self-Modifying Code
    null,
    // Stack Memory
    null,

    // Reverse Sequence
    null,
    // Interleave // Principal Engineer
    [
        {
            from: manager,
            subject: "Wow!",
            create: s15,
        }
    ],

    // Indicator Function
    null,
    // Sort
    null,
    // Mode // Partner Engineer
    [
        {
            from: manager,
            subject: "A well-deserved promotion",
            create: s18,
        }
    ],

    // Characters
    null,
    // Decimal Digits
    null,
    // Uppercase
    null,
    // Strings
    null,
    // Tokenizer // Distinguished Engineer
    [
        {
            from: manager,
            subject: "Amazing!",
            create: s23,
        }
    ],

    // Parse Decimal
    null,
    // Print Decimal
    null,
    // Calculator // Technical Fellow
    [
        {
            from: manager,
            subject: "A special promotion",
            create: s26,
        }
    ],

    // Multi-Line Strings
    null,
    // Parse Data Directives
    null,
    // Parse Subleq Instructions
    null,
    // Self-Hosting // Technical Fellow Emeritus
    [
        {
            from: manager,
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

const solvedContact: Contact = { name: "Automated Task Management" };
for (let i = 1; i < solvedMails.length; i++) {
    const puzzle = puzzleFlatArray[i - 1];
    const mailList = solvedMails[i] || [];
    solvedMails[i] = mailList;
    mailList.unshift({
        from: solvedContact,
        subject: `RE: ${puzzle.title}`,
        unimportant: true,
        create: (context: MailContext) => {
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

let idToMail: Record<string, Mail> = {
    // TODO
    // Miscellaneous mails (m0, m1, ...)
    // m0: {
    //     subject: "Easter egg",
    //     from: "A friend",
    //     create: () => <><p>How'd you find this!?</p></>,
    // },
};

// NOTE: Offset zero is for intro mails, so the index here is puzzleFlatArrayIndex + 1 (note the +1!)
function getIdForSolvedMail(oneBasedIndex: number, index: number): string {
    return `s${oneBasedIndex}_${index}`;
}

// Mails that result from solving puzzles (s0, s1, ...)
const solvedMailsFlat: Mail[] = [];
for (let i = 0; i < solvedMails.length; i++) {
    const mailList = solvedMails[i];
    if (mailList) {
        for (let j = 0; j < mailList.length; j++) {
            const mailData = mailList[j];
            const id = getIdForSolvedMail(i, j);
            const mail = {
                id,
                isSolutionStatisticsMail: true,
                ...mailData,
            };

            idToMail[id] = mail;
            solvedMailsFlat.push(mail);
        }
    }
}

export const mails = idToMail;

type InboxIds = { [id: string]: boolean };

function getInboxIds(inbox: Inbox): InboxIds {
    const inboxIds: { [id: string]: boolean } = {};
    for (const { id } of inbox) {
        inboxIds[id] = true;
    }
    return inboxIds;
}

function insertSolutionMailInOrder(inbox: Inbox, id: string): void {
    // Add solution mails in-place, in order, ignoring non-solution mails
    const indexOfNextMail = inbox.findIndex(mail => (mail.id.startsWith("s") && mail.id > id));
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

    // Add any new/missing mails for solved puzzles
    const inboxIds = getInboxIds(inbox);
    for (let i = 0; i < solvedMails.length; i++) {
        if (i === 0 || Sic1DataManager.getPuzzleData(puzzleFlatArray[i - 1].title).solved) {
            const solutionMails = solvedMails[i];
            for (let j = 0; j < solutionMails.length; j++) {
                const id = getIdForSolvedMail(i, j);
                if (!inboxIds[id]) {
                    // This mail isn't in the inbox; add it
                    updated = true;
                    insertSolutionMailInOrder(inbox, id);
                }
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
    const solvedMailsIndex = puzzleFlatArrayIndex + 1; // Note: +1 for accessing solvedMails array!
    const inbox = Sic1DataManager.getData().inbox!;
    const inboxIds = getInboxIds(inbox);

    let updated = false;
    const solutionMails = solvedMails[solvedMailsIndex];
    for (let j = 0; j < solutionMails.length; j++) {
        const id = getIdForSolvedMail(solvedMailsIndex, j);
        if (!inboxIds[id]) {
            // This mail isn't in the inbox; add it
            updated = true;
            inbox.push({ id, read: false });
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
    const solvedMailsIndex = getIdForSolvedMail(puzzleIndex + 1, 0); // + 1 to get "solved count"; 0 for the "solution stats" mail (which is always first)
    ensureMailRead(mails[solvedMailsIndex], false);
}

export function hasUnreadMail(): boolean {
    const { inbox } = Sic1DataManager.getData();
    return inbox.findIndex(m => !m.read) !== -1;
}
