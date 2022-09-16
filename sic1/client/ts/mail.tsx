import { ComponentChildren } from "preact";
import { Puzzle, puzzles } from "sic1-shared";
import { Shared } from "./shared";
import { Sic1DataManager } from "./data-manager";
import { TextButton } from "./text-button";

export interface Contact {
    name: string;
    title: string;
}

export interface MailCallbacks {
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
}

export interface Mail {
    subject: string;
    from: Contact;
    create: (self: Contact, callbacks: MailCallbacks) => ComponentChildren;
}

const puzzleArray: Puzzle[] = [].concat(...puzzles.map(g => g.list));

const managerFirstName = "Jerin";
const manager = {
    name: `${managerFirstName} Kransky`,
    title: "Director of Engineering",
};

function createPromotionMessage(solvedCount: number, subject: string, create: (self: Contact, callbacks: MailCallbacks) => ComponentChildren): Mail {
    let puzzleLinkText: string;
    let assignmentText: string;
    switch (solvedCount) {
        case 0:
            puzzleLinkText = "Introduction to Subleq";
            assignmentText = "first";
            break;

        case puzzleArray.length:
            break;

        default:
            puzzleLinkText = puzzleArray[solvedCount].title;
            assignmentText = "next";
            break;
    }

    return {
        subject,
        from: manager,
        create: (self: Contact, callbacks: MailCallbacks) => <>
            {create(self, callbacks)}
            <p>-{managerFirstName}</p>
            {puzzleLinkText
                ? <>
                    <br />
                    <p>Click to proceed to your {assignmentText} assignment:</p>
                    <p>&gt; <TextButton text={puzzleLinkText} onClick={() => {
                        // Note: this clears all message boxes, including this one
                        callbacks.onLoadPuzzleRequested(puzzleArray[solvedCount]);
                    }} /></p>
                </>
                : <></>
            }
        </>,
    };
}

const solvedMails: (Mail | null)[] = [
    // Trainee
    createPromotionMessage(Shared.jobTitles[0].minimumSolved, "Welcome to the team!", (self, callbacks) => <>
        <p>Congratulations, {self.name}! SIC Systems has accepted your application. Introductory information and your first assignment are below.</p>
        <p>Introducing the SIC-1</p>
        <p>The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").</p>
        <p>Note that you can view the program inventory by clicking the "Menu" button or hitting ESC.</p>
    </>),

    // Subleq Instruction and Output
    null,
    // Data Directive and Looping
    null,
    // First Assessment // Engineer
    createPromotionMessage(Shared.jobTitles[1].minimumSolved, "Training complete!", (self) => <><p>Thanks for completing your introductory training assignments, {self.name}! Your starting job title is: {Shared.jobTitles[1].title}.</p><p>Please get started
        on your assignments right away.</p></>),

    // Addition
    null,
    // Subtraction
    null,
    // Sign Function
    null,
    // Multiplication
    null,
    // Division // Engineer II
    createPromotionMessage(Shared.jobTitles[2].minimumSolved, "Great start!", (self) => <><p>Nice work on the arithmetic programs, {self.name}! As of this email, you have been promoted to {Shared.jobTitles[2].title}.</p><p>Please continue your work.
        We expect great things from you!</p></>),

    // Sequence Sum
    null,
    // Sequence Cardinality
    null,
    // Number to Sequence // Senior Engineer
    createPromotionMessage(Shared.jobTitles[3].minimumSolved, "Excellent work!", (self) => <><p>Impressive work, {self.name}! Based on your stellar performance, I'm promoting you to {Shared.jobTitles[3].title}.</p><p>Your next couple of assignments are
        very important (and difficult), so please get started as soon as you can. Thanks for taking the time to prioritize this work over competing demands in your personal
        life!</p></>),

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
    createPromotionMessage(Shared.jobTitles[4].minimumSolved, "A well-deserved promotion", (self) => <><p>Spectacular work, {self.name}! Based on your innovative solutions, you are being promoted to {Shared.jobTitles[4].title}.</p><p>Your new assignments are on
        the bleeding edge of SIC Systems research. Welcome to the exciting world of natural language processing! As always, we greatly appreciate your willingness to work
        night and day to make SIC Systems more profitable! Even though it's getting late in the day, if you could continue your work, that would be super helpful.
        Thanks!</p></>),

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
    createPromotionMessage(Shared.jobTitles[5].minimumSolved, "A special promotion", (self) => <><p>Incredible work, {self.name}! After consulting with the SIC Systems board, I've been given special permission to promote you to {Shared.jobTitles[5].title}.
        </p><p>You've shown tenacity to get this far, and you'll need loads of it for the next batch of tasks. We need to give the SIC-1 the ability to understand its own
        code, in order to unleash its immense computing power on optimizing its own performance. We'll be happy to provide on-site food and laundry service, home
        cleaning/maintenance, and fertility preservation services to you as part of your compensation package. We just need you to push through this one last sprint to
        the finish line. Your fellow SIC Systems family members thank you for your perseverance!</p></>),

    // Multi-Line Strings
    null,
    // Parse Data Directives
    null,
    // Parse Subleq Instructions
    null,
    // Self-Hosting // Technical Fellow Emeritus
    createPromotionMessage(Shared.jobTitles[6].minimumSolved, "Unbelievable work!", (self) => <><p>Truly amazing work, {self.name}! The SIC Systems board unanimously voted to create a new title just for you: {Shared.jobTitles[6].title}.</p><p>Thank you
        from the bottom of my heart for all of the sacrifices you've made to get us to this point. The SIC-1 is now able to reason about its own code. This is an
        amazing breakthrough and you should be very proud.</p><p>Now that we've reached this exciting milestone (thanks to your tireless efforts!), SIC Systems honestly can't
        challenge someone with your peerless talent. Excitingly, you can now begin the next phase of your career at one of the many other technology companies around the world.
        I know parting ways is tough, but SIC Systems is a business, not a family, so we have to say goodbye to employees once they're no longer needed. Thank you one last
        time, and best of luck in your future endeavors!</p></>),
];

let mailList: Record<string, Mail> = {
    // TODO
    // Miscellaneous mails (m0, m1, ...)
    // m0: {
    //     subject: "Easter egg",
    //     from: "A friend",
    //     create: () => <><p>How'd you find this!?</p></>,
    // },
};

function getKeyForSolvedMail(solvedCount: number): string {
    return `s${solvedCount}`;
}

// Mails that result from solving puzzles (s0, s1, ...)
for (let i = 0; i < solvedMails.length; i++) {
    const mail = solvedMails[i];
    if (mail) {
        mailList[getKeyForSolvedMail(i)] = mail;
    }
}

export const mails = mailList;

export function updateMailListForSolvedCount(): boolean {
    const data = Sic1DataManager.getData();
    const inbox = data.inbox ?? [];
    data.inbox = inbox;

    let added = false;
    for (let i = 0; i <= data.solvedCount; i++) {
        const mail = solvedMails[i];
        if (mail) {
            const key = getKeyForSolvedMail(i);
            if (inbox.indexOf(key) === -1) {
                // Need to add the element, but to handle future updates, try to insert in a reasonable location
                added = true;

                // First, see if there's a "next" key
                let nextKey: string | null = null;
                for (let j = i + 1; j < solvedMails.length; j++) {
                    if (solvedMails[j] !== null) {
                        nextKey = getKeyForSolvedMail(j);
                        break;
                    }
                }

                // If there's a "next" key, try and find it in the list
                let inserted = false;
                if (nextKey) {
                    const indexOfNextKey = inbox.indexOf(nextKey);
                    if (indexOfNextKey >= 0) {
                        // The *next* mail is already present, so insert this right before it
                        inbox.splice(indexOfNextKey, 0, key);
                        inserted = true;
                    }
                }

                if (!inserted) {
                    // The *next* mail (if any) is not present; add to the end of the list
                    inbox.push(key);
                }
            }
        }
    }

    if (added) {
        Sic1DataManager.saveData();
    }

    return added;
}
