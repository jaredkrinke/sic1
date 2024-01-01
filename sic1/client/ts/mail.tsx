import React from "react";
import { puzzleFlatArray } from "../../shared/puzzles";
import { Inbox, Sic1DataManager } from "./data-manager";
import { createPuzzleCharts } from "./puzzle-list";
import { PuzzleFriendLeaderboardPromises } from "./service";
import { Contacts } from "./contacts";
import * as Content from "../content/tsx/index";
import storyMailDataRaw from "../content/tsx/mail";
import { storyMailContents } from "./mail-story";
import { Mail, MailData } from "./mail-shared";
import { FormattedMessage } from "react-intl";
import { Shared } from "./shared";

const enrichMailData = (data: any) => ({
    ...data,
    from: Contacts[data.from],
});

const storyMailData: (MailData[] | null)[] = storyMailDataRaw.map(row => ((row === null) ? null : row.map(enrichMailData)));

storyMailData[0].unshift({
    ...enrichMailData(Content.devEnvironmentMetadata),
    create: Content.devEnvironment,
});

storyMailData[0].unshift({
    from: Contacts.onboarding,
    subject: "SIC-1 Reference Manual",
    create: Content.sic1Assembly,
    actions: ["manualInNewWindow"],
});

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
for (let i = 0; i < puzzleFlatArray.length; i++) {
    const puzzle = puzzleFlatArray[i];

    puzzleMails.push({
        id: puzzle.title,

        // Note: This solved count isn't 100% accurate because puzzles can be solved out of order, but it is only
        // used for displaying job titles in mail, so it's not a big deal
        solvedCount: i + 1,

        loadType: "puzzle",

        from: Contacts.taskManagement,
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
                <p>
                    <FormattedMessage
                        id="mailViewerTaskCompleted"
                        description="Markup shown for a 'task completed successfully' mail, indicating the program was correct"
                        defaultMessage="Well done! Your program produced the correct output. Thanks for your contribution to SIC Systems!"
                        />
                </p>
                {(cycles && bytes)
                    ? <>
                        <p>{Shared.resources.taskStatistics}</p>
                        {createPuzzleCharts(title, cycles, bytes, leaderboardPromises)}
                    </>
                    : null
                }
            </>;
        },
    });
}

const triggeredMails: Mail[] = [
];

const idToMail: Record<string, Mail> = {};

function getIdForStoryMail(solvedCount: number, index: number): string {
    return `s${solvedCount}_${index}`;
}

// Triggered mails
for (const mail of triggeredMails) {
    idToMail[mail.id] = mail;
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
            const mail: Mail = {
                id,
                solvedCount: i, 
                ...mailData,
            };

            idToMail[id] = mail;
            storyMails[i][j] = mail;
        }
    }
}

// TODO: This is a prototype for localized mails
for (const storyMailContent of storyMailContents) {
    idToMail[storyMailContent.id] = storyMailContent;
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

export function addTriggeredMail(id: string): void {
    const inbox = Sic1DataManager.getData().inbox!;
    if (inbox.findIndex(m => m.id === id) === -1) {
        inbox.push({ id, read: false });
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
