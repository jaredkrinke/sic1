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

const contactOnboarding = { name: "SIC Systems Onboarding" };

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
    [
        {
            from: contactOnboarding,
            subject: "SIC-1 Reference Manual",
            create: () => <>
<h2 id="single-instruction-computer-mark-1-sic-1">Single Instruction Computer Mark 1 (SIC-1)</h2>
<p>The SIC-1 is an 8-bit computer with 256 bytes of memory. Programs for the SIC-1 are written in SIC-1 Assembly Language, as described below.</p>
<h2 id="subleq-instruction">subleq instruction</h2>
<p>Each <code>subleq</code> instruction is 3 bytes, specified as follows:</p>
<pre><code>{`subleq <A> <B> [<C>]`}</code></pre>
<p><code>A</code>, <code>B</code>, and <code>C</code> are memory addresses (0 - 255) or labels.</p>
<p><code>subleq</code> subtracts the value at address <code>B</code> from the value at address <code>A</code> and stores
    the result at address <code>A</code> (i.e. <code>mem[A] = mem[A] - mem[B]</code>).</p>
<p>If the result is &lt;= 0, execution branches to address <code>C</code>.</p>
<p>Note that if <code>C</code> is not specified, the address of the next instruction is automatically added by the
    assembler (in effect, this means that taking the branch is no different from advancing to the next instruction).</p>
<h2 id="built-in-addresses">Built-in addresses</h2>
<p>For convenience, addresses can be specified using labels. The following predefined labels are always available:</p>
<ul>
    <li><code>@MAX</code> (252): Maximum user-modifiable address</li>
    <li><code>@IN</code> (253): Reads a value from input (writes are ignored)</li>
    <li><code>@OUT</code> (254): Writes a result to output (reads as zero)</li>
    <li><code>@HALT</code> (255): Terminates the program when accessed</li>
</ul>
<h2 id="subleq-example">subleq example</h2>
<p>Below is a very simple SIC-1 program that negates one input value and writes it out.</p>
<p>E.g. if the input value from <code>@IN</code> is 3, it subtracts 3 from <code>@OUT</code> (which reads as zero), and
    the result of 0 - 3 = -3 is written out.</p>
<pre><code>{`subleq @OUT, @IN`}</code></pre>
<h2 id="comments">Comments</h2>
<p>Any text following a semicolon is considered a comment. Comments are ignored by the assembler, but may be helpful to
    humans attempting to decipher existing programs. For example, here's the previous line of assembly with an
    explanatory comment:</p>
<pre><code>{`subleq @OUT, @IN ; Negates an input and writes it out`}</code></pre>
<h2 id="labels">Labels</h2>
<p>Custom labels are defined by putting <code>@name:</code> at the beginning of a line, e.g.:</p>
<pre><code>{`@loop: subleq 1, 2`}</code></pre>
<h2 id="data-directive">.data directive</h2>
<p>In addition to <code>subleq</code>, there is an assembler directive <code>.data</code> that sets a byte of memory to
    a value at compile time (note: this is not an instruction!):</p>
<pre><code>{`.data <X>`}</code></pre>
<p><code>X</code> is a signed byte between -128 and 127 (inclusive).</p>
<h2 id="constants-and-variables">Constants and variables</h2>
<p>Combining labels and the <code>.data</code> directive allows you to develop of system of constants and variables. For
    example, here a byte is set to zero, and the label <code>@zero</code> points to that value:</p>
<pre><code>{`@zero: .data 0`}</code></pre>
<h2 id="unconditional-jumps">Unconditional jumps</h2>
<p>Variables can be used for implementing an unconditional jump:</p>
<pre><code>{`subleq @zero, @zero, @next`}</code></pre>
<p>This will set <code>@zero</code> to zero minus zero (still zero) and, since the result is always &lt;= 0, execution
    always branches to the label <code>@next</code>.</p>
<h2 id="loop-example">Loop example</h2>
<p>Below is an updated negation program that repeatedly negates input values and writes them out in a loop.</p>
<pre><code>{`@loop:
subleq @OUT, @IN           ; Negate an input and write it out
subleq @zero, @zero, @loop ; Unconditional jump to @loop

@zero: .data 0             ; Always zero`}</code></pre>
<h2 id="label-offsets">Label offsets</h2>
<p>Label expressions can include an optional offset. For example, <code>@loop+1</code> refers to the second byte of the instruction pointed to by <code>@loop</code>:</p>
<pre><code>{`@loop:
subleq @loop+1, @one`}</code></pre>
<h2 id="reflection-example">Reflection example</h2>
<p>Label offsets are useful in self-modifying code. Remember, each <code>subleq</code> instruction is stored as 3 consecutive
    addresses: <code>ABC</code> (for <code>mem[A] = mem[A] - mem[B]</code>, with a branch to <code>C</code> if the
    result is less than or equal to zero).</p>
<p>The sample program below reads its own compiled code and outputs it by incrementing the second address of the
    instruction at <code>@loop</code> (i.e. modifying address <code>@loop+1</code>).</p>
<pre><code>{`@loop:
subleq @tmp, 0           ; Second address (initially zero) will be incremented below
subleq @OUT, @tmp        ; Output the value
subleq @loop+1, @n_one   ; Here is where the increment is performed
subleq @tmp, @tmp, @loop ; Reset @tmp to zero and unconditionally jump to @loop

@tmp: .data 0            ; @tmp is initialized to zero
@n_one: .data -1`}</code></pre>
<p>The third instruction is an example of self-modifying code because it actually modifies the first instruction.
    Specifically, it increments the first instruction's second address (<code>@loop+1</code>). This causes the
    <em>next</em> loop iteration's first instruction to read the <em>next</em> byte of memory (0, 1, 2, 3, ...).</p>
<h2 id="stack-example">Stack example</h2>
<p>This program implements a first-in, first-out stack by modifying the read and write addresses of the instructions
    that interact with the stack.</p>
<p>The program pushes 3 (defined by <code>@count</code>) input values onto the stack and then pops them off (outputting
    them in reverse order).</p>
<pre><code>{`; The first address of this instruction (which starts
; pointing to @stack) will be incremented with each
; write to the stack
@stack_push:
subleq @stack, @IN
subleq @count, @one, @prepare_to_pop

; Modify the instruction at @stack_push (increment
; target address)
subleq @stack_push, @n_one
subleq @tmp, @tmp, @stack_push

; Prepare to start popping values off of the stack by
; copying the current stack position to @stack_pop+1
@prepare_to_pop:
subleq @tmp, @stack_push
subleq @stack_pop+1, @tmp

; Read a value from the stack (note: the second address
; of this instruction is repeatedly decremented)
@stack_pop:
subleq @OUT, 0

; Decrement stack address in the instruction at @stack_pop
subleq @stack_pop+1, @one
subleq @tmp, @tmp, @stack_pop

; Constants
@one: .data 1
@n_one: .data -1

; Variables
@tmp: .data 0
@count: .data 3

; Base of stack (stack will grow upwards)
@stack: .data 0`}</code></pre>
<h2 id="characters">Characters</h2>
<p>When configured properly, the SIC-1 supports natural human language input and output using a highly modern (c. 1967)
    mapping from numbers to characters known as ASCII. For example, 72 is mapped to "H" (capital "h").</p>
<p>To capture the characters "Hi" (capital "h", lower case "i") in two variables, one could consult an ASCII lookup
    table and write:</p>
<pre><code>{`@H: .data 72
@i: .data 105`}</code></pre>
<p>Consulting an ASCII table is tedious, so to make SIC Systems engineers' lives easier, SIC-1 Assembly Language now
    supports automated ASCII lookup using the following advanced syntax (which is equivalent to explicitly specifying
    characters' mapped numbers):</p>
<pre><code>{`@H: .data 'H' ; 72
@i: .data 'i' ; 105`}</code></pre>
<p>As a final convenience, it is possible to negate the value of a character by prefixing the character literal with a
    minus:</p>
<pre><code>{`@n_H: .data -'H' ; -72`}</code></pre>
<h2 id="character-output-example">Character output example</h2>
<p>The following sample program outputs the characters "Hi":</p>
<pre><code>{`subleq @OUT, @n_H ; Note: (0 - (-72) = 72 = 'H')
subleq @OUT, @n_i

@n_H: .data -'H'
@n_i: .data -'i'`}</code></pre>
<h2 id="strings">Strings</h2>
<p>Strings are sequences of characters that are terminated with a zero. In the following example, @string points to a 3
    byte sequence representing the string "Hi":</p>
<pre><code>{`@string:
.data 'H'
.data 'i'
.data 0`}</code></pre>
<p>Although not discussed previously, the .data directive can actually take a sequence of values to set multiple bytes,
    so the previous code would be simplified:</p>
<pre><code>{`@string: .data 'H', 'i', 0`}</code></pre>
<p>And thanks to the innovative design-by-committee approach employed by SIC Systems, the following novel syntax for
    strings can be used (again, equivalent to the other examples):</p>
<pre><code>{`@string: "Hi" ; Sets the next 3 bytes: 'H', 'i', 0`}</code></pre>
<p>Similar to character values, an entire string can be negated by prefixing it with a minus:</p>
<pre><code>{`@n_string: -"Hi" ; Sets the next 3 bytes: -72, -105, 0`}</code></pre>
<h2 id="new-line-characters">New line characters</h2>
<p>New line characters (value 10) can be expressed with the character <code>'\n'</code>. They can also be used in
    strings, for example: <code>"Line 1\nLine 2"</code>.</p>
<h2 id="string-output-example">String output example</h2>
<p>The following code outputs "Hello, world!":</p>
<pre><code>{`@loop:
subleq @OUT, @n_message  ; Read address starts at @n_message
subleq @loop+1, @n_one   ; Advance read address
subleq @tmp, @tmp, @loop

@n_one: .data -1
@n_message: .data -"Hello, world!"
@tmp: .data 0`}</code></pre>
                </>,
        },
        // {
        //     from: contactOnboarding,
        //     subject: "SIC-1 Dev. Environment",
        //     create: () => <>
        //         <p>TODO</p>
        //         </>,
        // },
        createPromotionMessage("Welcome to the team!", (self, callbacks) => <>
            <p>Congratulations, {self.name}! SIC Systems has accepted your application. Introductory information and your first assignment are below.</p>
            <p>Introducing the SIC-1</p>
            <p>The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").</p>
            <p>Note that you can view the program inventory by clicking the "Menu" button or hitting ESC.</p>
            </>),
    ],

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
    // Interleave // Principal Engineer
    [createPromotionMessage("Excellent work!", (self) => <><p>Impressive work, {self.name}! Based on your stellar performance, I'm promoting you to {Shared.jobTitles[4].title}.</p></>)], // TODO
    // Indicator Function
    null,
    // Sort
    null,
    // Mode // Partner Engineer
    [createPromotionMessage("A well-deserved promotion", (self) => <><p>Spectacular work, {self.name}! Based on your innovative solutions, you are being promoted to {Shared.jobTitles[5].title}.</p><p>Your new assignments are on
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
    // Tokenizer // Distinguished Engineer
    [createPromotionMessage("Excellent work!", (self) => <><p>Impressive work, {self.name}! Based on your stellar performance, I'm promoting you to {Shared.jobTitles[6].title}.</p></>)], // TODO
    // Parse Decimal
    null,
    // Print Decimal
    null,
    // Calculator // Technical Fellow
    [createPromotionMessage("A special promotion", (self) => <><p>Incredible work, {self.name}! After consulting with the SIC Systems board, I've been given special permission to promote you to {Shared.jobTitles[7].title}.
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
    [createPromotionMessage("Unbelievable work!", (self) => <><p>Truly amazing work, {self.name}! The SIC Systems board unanimously voted to create a new title just for you: {Shared.jobTitles[8].title}.</p><p>Thank you
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
