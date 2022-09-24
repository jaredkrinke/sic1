import { ComponentChildren } from "preact";
import { Puzzle, puzzleFlatArray } from "sic1-shared";
import { Shared } from "./shared";
import { Sic1DataManager } from "./data-manager";
import { createPuzzleCharts } from "./puzzle-list";
import { PuzzleFriendLeaderboardPromises } from "./service";

export interface Contact {
    name: string;
    title?: string;
}

export interface MailCallbacks {
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
}

interface MailData {
    subject: string;
    from: Contact;
    create: (self: Contact, callbacks: MailCallbacks) => ComponentChildren;
    unimportant?: boolean;
}

export type Mail = MailData & {
    id: string;
    isSolutionStatisticsMail: boolean; // True if this is an automated statistics mail
};

const managerFirstName = "Jerin";
const manager = {
    name: `${managerFirstName} Kransky`,
    title: "Director of Engineering",
};

function createPromotionMessage(subject: string, create: (self: Contact, callbacks: MailCallbacks) => ComponentChildren): MailData {
    return {
        subject,
        from: manager,
        create: (self: Contact, callbacks: MailCallbacks) => <>
            {create(self, callbacks)}
            <p>-{managerFirstName}</p>
        </>,
    };
}

const solvedMails: (MailData[] | null)[] = [
    // Trainee
    [createPromotionMessage("Welcome to the team!", (self, callbacks) => <>
        <p>Congratulations, {self.name}! SIC Systems has accepted your application. Introductory information and your first assignment are below.</p>
        <p>Introducing the SIC-1</p>
        <p>The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").</p>
        <p>Note that you can view the program inventory by clicking the "Menu" button or hitting ESC.</p>
    </>)],

    // Subleq Instruction and Output
    null,
    // Data Directive and Looping
    null,
    // First Assessment // Engineer
    [createPromotionMessage("Training complete!", (self) => <><p>Thanks for completing your introductory training assignments, {self.name}! Your starting job title is: {Shared.jobTitles[1].title}.</p><p>Please get started
        on your assignments right away.</p></>)],

    // Addition
    null,
    // Subtraction
    null,
    // Sign Function
    null,
    // Multiplication
    null,
    // Division // Engineer II
    [createPromotionMessage("Great start!", (self) => <><p>Nice work on the arithmetic programs, {self.name}! As of this email, you have been promoted to {Shared.jobTitles[2].title}.</p><p>Please continue your work.
        We expect great things from you!</p></>)],

    // Sequence Sum
    null,
    // Sequence Cardinality
    null,
    // Number to Sequence // Senior Engineer
    [createPromotionMessage("Excellent work!", (self) => <><p>Impressive work, {self.name}! Based on your stellar performance, I'm promoting you to {Shared.jobTitles[3].title}.</p><p>Your next couple of assignments are
        very important (and difficult), so please get started as soon as you can. Thanks for taking the time to prioritize this work over competing demands in your personal
        life!</p></>)],

    // Self-Modifying Code
    null,
    // Stack Memory
    null,

    // Reverse Sequence
    null,
    // Interleave
    null,
    // Indicator Function
    null,
    // Sort
    null,
    // Mode // Principal Engineer
    [createPromotionMessage("A well-deserved promotion", (self) => <><p>Spectacular work, {self.name}! Based on your innovative solutions, you are being promoted to {Shared.jobTitles[4].title}.</p><p>Your new assignments are on
        the bleeding edge of SIC Systems research. Welcome to the exciting world of natural language processing! As always, we greatly appreciate your willingness to work
        night and day to make SIC Systems more profitable! Even though it's getting late in the day, if you could continue your work, that would be super helpful.
        Thanks!</p></>)],

    // Characters
    null,
    // Decimal Digits
    null,
    // Uppercase
    null,
    // Strings
    null,
    // Tokenizer
    null,
    // Parse Decimal
    null,
    // Print Decimal
    null,
    // Calculator // Partner Engineer
    [createPromotionMessage("A special promotion", (self) => <><p>Incredible work, {self.name}! After consulting with the SIC Systems board, I've been given special permission to promote you to {Shared.jobTitles[5].title}.
        </p><p>You've shown tenacity to get this far, and you'll need loads of it for the next batch of tasks. We need to give the SIC-1 the ability to understand its own
        code, in order to unleash its immense computing power on optimizing its own performance. We'll be happy to provide on-site food and laundry service, home
        cleaning/maintenance, and fertility preservation services to you as part of your compensation package. We just need you to push through this one last sprint to
        the finish line. Your fellow SIC Systems family members thank you for your perseverance!</p></>)],

    // Multi-Line Strings
    null,
    // Parse Data Directives
    null,
    // Parse Subleq Instructions
    null,
    // Self-Hosting // Technical Fellow Emeritus
    [createPromotionMessage("Unbelievable work!", (self) => <><p>Truly amazing work, {self.name}! The SIC Systems board unanimously voted to create a new title just for you: {Shared.jobTitles[6].title}.</p><p>Thank you
        from the bottom of my heart for all of the sacrifices you've made to get us to this point. The SIC-1 is now able to reason about its own code. This is an
        amazing breakthrough and you should be very proud.</p><p>Now that we've reached this exciting milestone (thanks to your tireless efforts!), SIC Systems honestly can't
        challenge someone with your peerless talent. Excitingly, you can now begin the next phase of your career at one of the many other technology companies around the world.
        I know parting ways is tough, but SIC Systems is a business, not a family, so we have to say goodbye to employees once they're no longer needed. Thank you one last
        time, and best of luck in your future endeavors!</p></>)],
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
        create: (self: Contact, callbacks: MailCallbacks) => {
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

function getIdForSolvedMail(solvedCount: number, index: number): string {
    return `s${solvedCount}_${index}`;
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

export function updateMailListForSolvedCount(read: boolean = true): boolean {
    const data = Sic1DataManager.getData();
    const inbox = data.inbox ?? [];
    data.inbox = inbox;

    let added = false;
    for (let i = 0; i <= data.solvedCount; i++) {
        const mailList = solvedMails[i];
        if (mailList) {
            for (let j = 0; j < mailList.length; j++) {
                const mail = mailList[j];
                if (mail) {
                    const id = getIdForSolvedMail(i, j);
                    if (inbox.findIndex(m => m.id === id) === -1) {
                        // Need to add the element, but to handle future updates, try to insert in a reasonable location
                        added = true;
        
                        // First, see if there's a "next" id
                        let nextId: string | null = null;
                        for (let k = solvedMailsFlat.findIndex(m => m.id === id) + 1; k < solvedMailsFlat.length; k++) {
                            nextId = solvedMailsFlat[k].id;
                            break;
                        }
        
                        // If there's a "next" id, try and find it in the list
                        let inserted = false;
                        if (nextId) {
                            const indexOfNextId = inbox.findIndex(m => m.id === nextId);
                            if (indexOfNextId >= 0) {
                                // The *next* mail is already present, so insert this right before it
                                inbox.splice(indexOfNextId, 0, { id, read });
                                inserted = true;
                            }
                        }
        
                        if (!inserted) {
                            // The *next* mail (if any) is not present; add to the end of the list
                            inbox.push({ id, read });
                        }
                    }
                }
            }
        }
    }

    if (added) {
        Sic1DataManager.saveData();
    }

    return added;
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
    const solutionStatsMailId = getIdForSolvedMail(puzzleIndex + 1, 0); // + 1 to get "solved count"; 0 for the "solution stats" mail (which is always first)
    ensureMailRead(mails[solutionStatsMailId], false);
}

export function hasUnreadMail(): boolean {
    const { inbox } = Sic1DataManager.getData();
    return inbox.findIndex(m => !m.read) !== -1;
}
