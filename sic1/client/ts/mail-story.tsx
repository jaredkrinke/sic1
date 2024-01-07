import React from "react";
import { Contacts } from "./contacts";
import { FormattedMessage } from "react-intl";
import { Mail } from "./mail-shared";
import { Shared } from "./shared";

export const storyMailContents: Mail[] = [

    {
        id: "s0_1",
        from: Contacts.onboarding,
        subject: <FormattedMessage
            id="mails0_1Subject"
            description="Subject line for story mail s0_1"
            defaultMessage="SIC-1 Dev. Environment"
            />,
        create: (context) => <FormattedMessage
            id="mails0_1Content"
            description="HTML content for story mail s0_1"
            defaultMessage={`<h3>SIC-1 DEVELOPMENT ENVIRONMENT</h3>
<p>The SIC-1 Development Environment provides a state-of-the-art programming and simulation environment for SIC Systems's Single Instruction Computer Mark 1 (SIC-1).</p>
<h3>MENUS</h3>
<p>Menus can be accessed using either the "Esc" key or the "Menu" button in the lower-left of the development environment. The Main Menu provides access to the following:</p>
<ul>
<li><strong>Program Inventory</strong>: Used for switching between assigned programming tasks, as well as viewing employee and task statistics (described in a dedicated section below).</li>
<li><strong>Electronic Mail</strong>: An integrated client application for viewing electronic mail from automated agents and other SIC-1 employees (described in a dedicated section below).</li>
<li><strong>Options</strong>: A sub-menu for modifying presentation settings (full-screen mode, volume, etc.), and other miscellaneous menus.</li>
</ul>
<h3>INTEGRATED DEVELOPMENT ENVIRONMENT</h3>
<p>The SIC-1 Development Environment desktop is an integrated development environment (IDE) for the SIC-1. There are three main sections (left, right, center):</p>
<ul>
<li><strong>Left</strong>: Current task description, table of input and output (both expected and actual), simulation state/statistics, buttons for controlling the simulation, and a button for opening the Main Menu (described above).</li>
<li><strong>Center</strong>: Main code editor for reading and writing SIC-1 Assembly Language programs (see the separate SIC-1 Reference Manual electronic mail for details).</li>
<li><strong>Right</strong>: Detailed simulation state including a complete view of SIC-1 memory, code manipulation tools, as well as an unprecedented, revolutionary feature: a table of variables and their current values, for convenient lookup.</li>
</ul>
<p>The memory table is shown in hexadecimal for compactness; hover over a cell to see the corresponding decimal value.</p>
<p>During execution, the current instruction will be highlighted in both the code editor (center) and the memory table (upper right), current inputs and outputs are highlighted in the tables on the left, and variables are displayed in a table on the right (hover for hexadecimal and unsigned representations, if needed).</p>
<p>To aid debugging, it is possible to set breakpoints on <code>subleq</code> instructions. When hit, these breakpoints will pause execution for manual analysis. There are two ways to set breakpoints:</p>
<ul>
<li>In code, add <code>!</code> to the beginning of a line (e.g. <code>!subleq @OUT, @IN</code>).</li>
<li>During execution, click the small circle to the left of any <code>subleq</code> instruction to toggle the breakpoint.</li>
</ul>
<p>Note that each program may be tested using multiple distinct test sets, the state of the SIC-1 resets between test sets, and the test sets generally include randomly generated input data. Solutions should be robust to arbitrary random data, in order to be eligible for inclusion in solution statistics.</p>
<h3>KEYBOARD SHORTCUTS</h3>
<p>The SIC-1 Development Environment supports the following convenient keyboard shortcuts:</p>
<ul>
<li><strong>Esc</strong>: Open/close menu or, if running, pause/halt execution.</li>
<li><strong>Ctrl+.</strong>: Execute a single instruction and pause. If the program has not been compiled yet, this will compile the program and pause before executing the first instruction.</li>
<li><strong>Ctrl+Enter</strong>: Run instructions until completion/error/pause. If already running, this will increase the speed of execution.</li>
<li><strong>Ctrl+Shift+Enter</strong>: Pause execution (if running), otherwise halt execution.</li>
<li><strong>F11, Alt+Enter</strong>: Toggle full-screen mode.</li>
</ul>
<p>Code editing shortcuts:</p>
<ul>
<li><strong>Ctrl+K Ctrl+F</strong>: Comment out all of the selected lines</li>
<li><strong>Ctrl+K Ctrl+U</strong>: Uncomment all of the selected lines</li>
<li><strong>Ctrl+M</strong>: Toggle <strong>Tab Insert</strong> mode (by default the Tab key cycles focus, with Tab Insert mode, tabs can be entered into the code editor)</li>
<li><strong>Tab</strong>: If in <strong>Tab Insert</strong> mode, insert tabs into the selected lines</li>
<li><strong>Shift+Tab</strong>: If in <strong>Tab Insert</strong> mode, un-indent the selected lines</li>
</ul>
<h3>PROGRAM INVENTORY</h3>
<p>The Program Inventory displays a list of assigned tasks on the left. There is also a special "employee statistics" section at the top for viewing how your progress compares to other SIC Systems employees.</p>
<p>Select any task on the left to view the description (or your solution's statistics, as compared to other employees' solutions, for completed tasks). There is button at the bottom to load the program into the development environment.</p>
<p>Under the "File Selection" heading, it's possible to manage multiple implementations of a task (notably: "New" creates a new solution with default contents, "Copy" duplicates an existing implementation). This can be useful when there is one solution optimizing for fewest cycles, and a different solution optimizing for accessing the least amount of memory.</p>
<p>If available, other non-task entries will appear in the Program Inventory, under the "Diversions" heading (such as Sandbox Mode or any company-sanctioned electronic video games--only for use during legally-mandated breaks).</p>
<h3>ELECTRONIC MAIL</h3>
<p>SIC Systems is pioneering a new digital form of intra-office communication known as "electronic mail". This eliminates paper waste for memos, and also ensures that all communications are securely routed to only the intended recipients.</p>
<p>A complete list of received electronic mail is shown in the left pane of the electronic mail viewer (sorted from oldest at the top to newest at the bottom). Note that automated mails are de-emphasized, but they can be opened to view statistics for your completed programming tasks.</p>
<p>If you have any unread mail, it will appear in a separate section at the top of the left page, for convenience.</p>
<p>Also, remember that you can always access the SIC-1 Reference Manual and this document about the SIC-1 Development Environment from your employee on-boarding mails at the top (oldest) part of the left pane of the electronic mail viewer.</p>
<h3>ADDENDUM</h3>
<p>Although the SIC-1 Development Environment has been thoroughly tested, it is possible that you may encounter unexpected behavior in certain instances. The authors of the SIC-1 Development Environment have assured us that the most likely causes for such issues are either cosmic rays or large solar flares interfering with sensitive electronics in an unpredictable manner. The simplest way to recover from such interference is to unplug the computer, wait for 30 seconds to allow it to cool and eject any rogue electrons, and then plug it back in.</p>
`}
            />,
        actions: [
            "manualInNewWindow"
        ],
    },


    {
        id: "s0_2",
        from: Contacts.hr,
        subject: <FormattedMessage
            id="mails0_2Subject"
            description="Subject line for story mail s0_2"
            defaultMessage="Welcome to SIC Systems!"
            />,
        create: (context) => <FormattedMessage
            id="mails0_2Content"
            description="HTML content for story mail s0_2"
            defaultMessage={`<p>Congratulations, {selfName}! SIC Systems has accepted your job application.</p>
<p>I'm Mary, and I'll be your human resources contact at the company.</p>
<p>As you're no doubt aware, as a new trainee, you'll need to complete a few unpaid training tasks before you're instated as a full-time employee.</p>
<p>You should have already received a couple of electronic mails from our automated onboarding system that you can review:</p>
<ul>
<li>The SIC-1 Reference Manual, which includes details on <code>subleq</code> and SIC-1 Assembly Language</li>
<li>A guide to the SIC-1 Development Environment (including usage information, keyboard shortcuts, etc.)</li>
</ul>
<p>You can view these mails at any time in the electronic mail viewer, which can be opened using the main menu (which is accessed using the "Menu" button in the lower-left, or by pressing "Esc").</p>
<p>All information is, of course, confidential and covered by the nondisclosure agreement you signed as a condition of employment.</p>
<p>Please let me know if you have any other questions.</p>
<p>Thank you!</p>
<p>-Mary</p>
`}
            values={{ selfName: context.self.name }}
            />,
        actions: [
            "manual",
            "manualInNewWindow"
        ],
    },


    {
        id: "s1_0",
        from: Contacts.badManager,
        subject: <FormattedMessage
            id="mails1_0Subject"
            description="Subject line for story mail s1_0"
            defaultMessage="Welcome to the team!"
            />,
        create: (context) => <FormattedMessage
            id="mails1_0Content"
            description="HTML content for story mail s1_0"
            defaultMessage={`<p>Hello, {selfName}!</p>
<p>I'm your manager, Don, and I'm excited to have you join our team! We're working very hard to ship our flagship product, the SIC-1, on time and we need all the help we can get.</p>
<p>You've already met Mary from HR. The other members of your immediate team are Ted and Feng (note: their cubicles are unfortunately on the far end of this floor away from you--I'll see if I can get you moved closer). In case you see any welcome mail from Rick, be aware that he is my boss (so your skip-level boss). If you have any concerns, I kindly ask you to raise them directly with me before looping in Rick.</p>
<p>With introductions out of the way, let's talk about your job description. You are to implement programs as they're assigned to you. Your solutions will be compared to other employees' solutions on the basis of execution time (measured in cycles) and memory usage (measured in bytes).</p>
<p>Thanks in advance for your dedication!</p>
<p>-Don</p>
<p>P.S. Sorry if it was unclear that you would not be paid during training. There must have been a mix-up on HR's end. I'll see if there's anything I can do to right the situation.</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s10_0",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails10_0Subject"
            description="Subject line for story mail s10_0"
            defaultMessage="Rick's mail"
            />,
        create: (context) => <FormattedMessage
            id="mails10_0Content"
            description="HTML content for story mail s10_0"
            defaultMessage={`<p>{selfName},</p>
<p>I just saw Rick's mail about Don being promoted for his innovations in sequence processing.</p>
<p>Could you drop by my cubicle to discuss a few things?</p>
<p>I recall seeing you working late the night before this breakthrough, and I'd just like to understand your involvement there. If your work was used, you deserve credit for it.</p>
<p>Regards,</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s11_0",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails11_0Subject"
            description="Subject line for story mail s11_0"
            defaultMessage="Organizational change"
            />,
        create: (context) => <FormattedMessage
            id="mails11_0Content"
            description="HTML content for story mail s11_0"
            defaultMessage={`<p>{selfName},</p>
<p>I know this is sudden and unexpected, but you're going to be joining my team, effective today. Additionally, you have been promoted to <strong>{jobTitle}</strong>.</p>
<p>I'm still not entirely clear what happened with Don and the new sequence processing work, but Rick mentioned that Don was considering letting you go, and I thought that seemed unfair. Fortunately, Rick was willing to give me a chance to add you to my team.</p>
<p>Anyway, whatever happened, it's in the past now and we need to focus on the road ahead.</p>
<p>Thanks for your hard work!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[3].title }}
            />,
    },


    {
        id: "s12_0",
        from: Contacts.mentor,
        subject: <FormattedMessage
            id="mails12_0Subject"
            description="Subject line for story mail s12_0"
            defaultMessage="Debugging"
            />,
        create: (context) => <FormattedMessage
            id="mails12_0Content"
            description="HTML content for story mail s12_0"
            defaultMessage={`<p>Greetings, {selfName}.</p>
<p>Self-modifying code can be tricky to understand at first. For the "stack memory" example, I found that it's easiest to simply step through the program (using the "Step" button or "Ctrl+.") to see what it's doing. Remember that you can click the circle next to a <code>subleq</code> instruction to toggle a breakpoint.</p>
<p>Using this approach, you can see that the first bit of code is a loop that repeats as long as <code>@count</code> is greater than zero. Once the counter runs out, execution branches to the next chunk of code, and so on.</p>
<p>You can also watch the stack grow in the "Memory" table in the upper right. In the example, the stack happens to start at address 32 (defined by <code>@stack_address</code>), which is the beginning of the third row of the table. Note that numbers are shown in hexadecimal and the "two's complement" representation is used for negative numbers (meaning <code>80</code> in hex is -128 in decimal), so <code>ff</code> means -1, <code>fe</code> means -2, and so on.</p>
<p>Hope that helps!</p>
<p>-Feng</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s13_0",
        from: Contacts.flunky1,
        subject: <FormattedMessage
            id="mails13_0Subject"
            description="Subject line for story mail s13_0"
            defaultMessage="REVERSE SEQUENCE???"
            />,
        create: (context) => <FormattedMessage
            id="mails13_0Content"
            description="HTML content for story mail s13_0"
            defaultMessage={`<p>I'm completely lost! How can I reverse a sequence when I don't even know its length??</p>
<p>Feng pointed me to the stack memory example, but that example only reverses 3 numbers. What if the sequence has 4 letters? Or 5???</p>
<p>This is starting to go way over my head... is there any chance I can copy your solution? I'll make sure to have it be a little slower so that it's not obvious I copied your work.</p>
<p>HELP!!!</p>
<p>-Ted</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s14_0",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails14_0Subject"
            description="Subject line for story mail s14_0"
            defaultMessage="Excellent work!"
            />,
        create: (context) => <FormattedMessage
            id="mails14_0Content"
            description="HTML content for story mail s14_0"
            defaultMessage={`<p>You're making great progress, {selfName}! These are some very difficult tasks and you're breezing right through them!</p>
<p>I'll make sure that Rick knows you're doing great work. I'm pushing hard for you to get promoted, because you really deserve it.</p>
<p>Well done!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s15_0",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails15_0Subject"
            description="Subject line for story mail s15_0"
            defaultMessage="Wow!"
            />,
        create: (context) => <FormattedMessage
            id="mails15_0Content"
            description="HTML content for story mail s15_0"
            defaultMessage={`<p>Wow! Great job, {selfName}! It looks like you have a deep understanding of self-modifying code. That will be a valuable skill as we continue to push the boundaries of the SIC-1.</p>
<p>It's my honor to let you know that you've earned a very well-deserved promotion to <strong>{jobTitle}</strong>!</p>
<p>Keep up the great work!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[4].title }}
            />,
    },


    {
        id: "s16_0",
        from: Contacts.badManager2,
        subject: <FormattedMessage
            id="mails16_0Subject"
            description="Subject line for story mail s16_0"
            defaultMessage="Very impressive!"
            />,
        create: (context) => <FormattedMessage
            id="mails16_0Content"
            description="HTML content for story mail s16_0"
            defaultMessage={`<p>Hi, {selfName}! It's been a while since we last chatted.</p>
<p>How do you like working on Pat's team? It looks like you're making excellent progress (between you and me, I think you're doing most, if not all, of the work, though).</p>
<p>Don't share this with anyone, but I've been working with one of the other managers (Jerin Kransky) on setting up natural language processing functionality for the SIC-1.</p>
<p>Do you have any interest in re-joining my team? I already have Jerin convinced that you're the right person for the job, and I think another promotion would be in order if you'd be willing to come join us.</p>
<p>Let me know what you think!</p>
<p>-Don</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s17_0",
        from: Contacts.flunky1,
        subject: <FormattedMessage
            id="mails17_0Subject"
            description="Subject line for story mail s17_0"
            defaultMessage="Don"
            />,
        create: (context) => <FormattedMessage
            id="mails17_0Content"
            description="HTML content for story mail s17_0"
            defaultMessage={`<p>Hey, {selfName}.</p>
<p>I was chatting with Don while we played our weekly round of golf this week, and he said that you were planning to come back to his team to work on some secret new project.</p>
<p>It would be awesome to have you back on the team!</p>
<p>-Ted</p>
<p>P.S. Any chance you'd have time to walk me through your solution to the "sort" task? Thanks!</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s18_0",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails18_0Subject"
            description="Subject line for story mail s18_0"
            defaultMessage="A promotion, and a new project!"
            />,
        create: (context) => <FormattedMessage
            id="mails18_0Content"
            description="HTML content for story mail s18_0"
            defaultMessage={`<p>Spectacular work, {selfName}! Based on your innovative solutions, you have been promoted to <strong>{jobTitle}</strong>.</p>
<p>Please don't mention this to anyone else, but I've heard rumors that Don (your old boss) and Jerin (another manager) are struggling to make progress on their natural language processing pipeline for the SIC-1.</p>
<p>To be honest, I don't think their team has any engineers of your caliber. I know it's risky, but I'd like to put you to work on solving some of the natural language problems (under the radar, so to speak).</p>
<p>If we can show definitive progress soon, then I think the board would be willing to move the whole project onto our team. That would be a big (and, frankly, unprecedented) promotion for you.</p>
<p>Let me know if you have any concerns. And please don't share this will anyone (especially Ted)!</p>
<p>Thank you!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[5].title }}
            />,
    },


    {
        id: "s19_0",
        from: Contacts.badManager2,
        subject: <FormattedMessage
            id="mails19_0Subject"
            description="Subject line for story mail s19_0"
            defaultMessage="Do you have a minute?"
            />,
        create: (context) => <FormattedMessage
            id="mails19_0Content"
            description="HTML content for story mail s19_0"
            defaultMessage={`<p>{selfName}, do you have a few minutes to drop by my office?</p>
<p>I'd like to know if you have put any thought into joining Jerin and I to work on that exciting new natural language processing project I mentioned to you a little while back. It could mean a big promotion for you!</p>
<p>If you have any concerns, please, please let me know. It would be a shame to see your talents wasted on another team, to be honest. We're really working on some revolutionary stuff here!</p>
<p>I'll stop by your cubicle in an hour or so, in case I don't hear from you by then.</p>
<p>Thanks!</p>
<p>-Don</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s20_0",
        from: Contacts.flunky1,
        subject: <FormattedMessage
            id="mails20_0Subject"
            description="Subject line for story mail s20_0"
            defaultMessage="Dust off your resume"
            />,
        create: (context) => <FormattedMessage
            id="mails20_0Content"
            description="HTML content for story mail s20_0"
            defaultMessage={`<p>Hey, {selfName}.</p>
<p>I don't know if you've heard, but there are rumors that layoffs are coming. Now might be a good time to dust off your resume!</p>
<p>Speaking of which, do you think you'd have a few minutes to drop by my cubicle and tell me what you think of my resume?</p>
<p>Do you think it would be a stretch to say that I lead development of sequence processing for the SIC-1 (when I was really only just part of a larger team that worked on it)?</p>
<p>Thanks, man!</p>
<p>-Ted</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s21_0",
        from: Contacts.mentor,
        subject: <FormattedMessage
            id="mails21_0Subject"
            description="Subject line for story mail s21_0"
            defaultMessage="Farewell!"
            />,
        create: (context) => <FormattedMessage
            id="mails21_0Content"
            description="HTML content for story mail s21_0"
            defaultMessage={`<p>Greetings, {selfName}.</p>
<p>I just wanted to let you know that today will be my last day at SIC Systems. I've enjoyed working with you, and I hope that my occasional clarifying electronic mails have been as beneficial to your career as working with you has been to mine.</p>
<p>I generally try to distance myself from office politics and rumors, but I wanted to let you know that I have credible information that the SIC Systems board is currently trying to fend off a hostile takeover by Ilano Moscato (a foreign billionaire who is rather eccentric, to put it mildly).</p>
<p>Based on what I've heard from friends who've worked at Ilano's other companies, I'm expecting working conditions here to deteriorate rapidly. Ilano has a reputation for randomly pivoting strategies, overworking his employees, and even flouting certain laws.</p>
<p>I urge you to consider looking for employment elsewhere.</p>
<p>Best of luck to you, {selfName}!</p>
<p>-Feng</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s22_0",
        from: Contacts.otherSkip,
        subject: <FormattedMessage
            id="mails22_0Subject"
            description="Subject line for story mail s22_0"
            defaultMessage="Natural language processing"
            />,
        create: (context) => <FormattedMessage
            id="mails22_0Content"
            description="HTML content for story mail s22_0"
            defaultMessage={`<p>Rick and Pat,</p>
<p>It has come to my attention that Pat's team has been discreetly working on natural language processing.</p>
<p><strong>This absolutely must stop.</strong></p>
<p>My team has been solely tasked (by the SIC Systems board) with designing and implementing the natural language processing pipeline for the SIC-1.</p>
<p>Your work is redundant and, to be blunt, a misuse of corporate resources. We cannot have two teams working independently on the same problem.</p>
<p>Pat, please turn over any documents you've created as a part of this duplicate effort immediately or I'll be forced to refer your entire team to corporate affairs for disciplinary action.</p>
<p>-Jerin</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s22_1",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails22_1Subject"
            description="Subject line for story mail s22_1"
            defaultMessage="Please ignore Jerin's mail"
            />,
        create: (context) => <FormattedMessage
            id="mails22_1Content"
            description="HTML content for story mail s22_1"
            defaultMessage={`<p>Hi, {selfName}.</p>
<p>It's unfortunate that Jerin sent that mail without consulting me or Rick first, but I want you to know that the work you're doing is very important and we shouldn't let office politics get in the way.</p>
<p>You have made fantastic progress on natural language processing, and I'm confident that once the board sees our tremendous progress, Jerin will be forced to back down. This isn't the first time an overzealous manager has come knocking on my door. Everything will be fine.</p>
<p>Additionally, <strong>I have put together a proposal to create a new position for you, with a significant pay bump</strong>. If you can finish this next task, I'm sure the board will have no other option than to promote you to <em>Distinguished Engineer</em>.</p>
<p>Thanks for all the hard work you've put in so far!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s23_0",
        from: Contacts.otherSkip,
        subject: <FormattedMessage
            id="mails23_0Subject"
            description="Subject line for story mail s23_0"
            defaultMessage="Welcome aboard!"
            />,
        create: (context) => <FormattedMessage
            id="mails23_0Content"
            description="HTML content for story mail s23_0"
            defaultMessage={`<p>Hi, {selfName}. In case we haven't met yet, I'm Jerin, a peer to your old skip-level manager Rick. I'd like to congratulate you on the work you've done so far. What I've seen has been most impressive!</p>
<p>Effective immediately, you'll be reporting directly to me to continue your exciting work on natural language processing.</p>
<p>Additionally, I'd like to inform you that you've been promoted to <strong>{jobTitle}</strong> (although, due to budget cuts, we won't be able to honor the original compensation package that was discussed).</p>
<p>Looking forward to working with you!</p>
<p>-Jerin</p>
<p>P.S. Pat is no longer employed by SIC Systems.</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[6].title }}
            />,
    },


    {
        id: "s24_0",
        from: Contacts.hr,
        subject: <FormattedMessage
            id="mails24_0Subject"
            description="Subject line for story mail s24_0"
            defaultMessage="SIC Systems acquisition"
            />,
        create: (context) => <FormattedMessage
            id="mails24_0Content"
            description="HTML content for story mail s24_0"
            defaultMessage={`<p>Engineering team,</p>
<p>As reported in the news, SIC Systems has agreed to be acquired by Ilano Moscato (majority owner and CEO of Edison, Herbaleaf, and Neutralino).</p>
<p>What this means for you:</p>
<ul>
<li>Your day-to-day duties remain the same</li>
<li>No major changes to the organization are planned</li>
<li>Ilano has indicated that he will honor all existing approved compensation packages (both cash and equity)</li>
</ul>
<p>In other words: "business as usual".</p>
<p>Please don't let reports in the media distract you from your work.</p>
<p>Let me know if you have any questions. Thank you!</p>
<p>-Mary</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s24_1",
        from: Contacts.otherSkip,
        subject: <FormattedMessage
            id="mails24_1Subject"
            description="Subject line for story mail s24_1"
            defaultMessage="New owner"
            />,
        create: (context) => <FormattedMessage
            id="mails24_1Content"
            description="HTML content for story mail s24_1"
            defaultMessage={`<p>{selfName},</p>
<p>I just wanted to let you know that I met with our new owner, Ilano, earlier today, and he's very excited about the work you're doing.</p>
<p>If there's anything you might need to grind through the last couple of tricky problems, please let me know.</p>
<p>-Jerin</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s25_0",
        from: Contacts.otherSkip,
        subject: <FormattedMessage
            id="mails25_0Subject"
            description="Subject line for story mail s25_0"
            defaultMessage="Right-sizing our team"
            />,
        create: (context) => <FormattedMessage
            id="mails25_0Content"
            description="HTML content for story mail s25_0"
            defaultMessage={`<p>{selfName},</p>
<p>I wanted to let you know that Rick, Don, and Ted have all been let go.</p>
<p>On the surface, it might sound like this means that all the remaining natural language work now falls on your plate. But there's a silver lining: I've been given the go-ahead to offer you some non-cash perks to help you manage your schedule, namely:</p>
<ul>
<li>Free breakfast, lunch and dinner at the office</li>
<li>On-site laundry service</li>
<li>An optional home cleaning/maintenance service, if you need it</li>
</ul>
<p>Thanks for pushing so hard these last few weeks and months!</p>
<p>-Jerin</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s26_0",
        from: Contacts.owner,
        subject: <FormattedMessage
            id="mails26_0Subject"
            description="Subject line for story mail s26_0"
            defaultMessage="A new focus"
            />,
        create: (context) => <FormattedMessage
            id="mails26_0Content"
            description="HTML content for story mail s26_0"
            defaultMessage={`<p>Jerin and {selfName},</p>
<p>Thanks for welcoming me. I'm excited to work with you!</p>
<p>Your team's work on natural language processing is near and dear to my heart. As you may have heard, I founded Neutralino a few years back, with a goal of allowing a machine to reason about itself.</p>
<p>I'd like to task you with a special project to bring a similar capability to the SIC-1, ideally by the end of this quarter. I've been shopping around this capability to various governments around the world, and already have "hand shake" agreements for a few multi-billion dollar orders.</p>
<p>To say that this work is important would be an understatement. It is revolutionary!</p>
<p>Regards,</p>
<p>-Ilano</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s26_1",
        from: Contacts.otherSkip,
        subject: <FormattedMessage
            id="mails26_1Subject"
            description="Subject line for story mail s26_1"
            defaultMessage="New focus, new title, new perks"
            />,
        create: (context) => <FormattedMessage
            id="mails26_1Content"
            description="HTML content for story mail s26_1"
            defaultMessage={`<p>{selfName},</p>
<p>I'm sure you saw the mail from Ilano. He thinks highly of us, but he also expects a lot.</p>
<p>To properly motivate you, Ilano has created a new job title exclusively for you: <strong>{jobTitle}</strong>.</p>
<p>You've shown tenacity to get this far, and you'll need loads of it for the next batch of tasks. We need to give the SIC-1 the ability to understand its own code, in order to unleash its immense computing power on optimizing its own performance. In addition to existing perks, we'll be happy to provide:</p>
<ul>
<li>Free super-vitamins (used by Ilano himself), produced by Herbaleaf</li>
<li>Optional sleeping quarters at the office</li>
<li>Discounted fertility preservation services</li>
</ul>
<p>We just need you to push through this one last sprint to the finish line. Your fellow SIC Systems family members thank you for your perseverance!</p>
<p>-Jerin</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[7].title }}
            />,
    },


    {
        id: "s27_0",
        from: Contacts.otherSkip,
        subject: <FormattedMessage
            id="mails27_0Subject"
            description="Subject line for story mail s27_0"
            defaultMessage="Compensation"
            />,
        create: (context) => <FormattedMessage
            id="mails27_0Content"
            description="HTML content for story mail s27_0"
            defaultMessage={`<p>{selfName},</p>
<p>I know we had discussed increasing your compensation, given the increased scope and impact of your work.</p>
<p>Unfortunately, Ilano has put a freeze on all new spending, so there's nothing I can do. My hands are tied.</p>
<p>Having said that, I'm sure that once your work is complete and Ilano sees what you've been able to accomplish, he'll make sure you're duly compensated. He might even want to shift you over to one of his other companies where technical know-how is needed.</p>
<p>Just keep your focus on the task at hand!</p>
<p>-Jerin</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s27_1",
        from: Contacts.hr,
        subject: <FormattedMessage
            id="mails27_1Subject"
            description="Subject line for story mail s27_1"
            defaultMessage="Ilano meet & greet"
            />,
        create: (context) => <FormattedMessage
            id="mails27_1Content"
            description="HTML content for story mail s27_1"
            defaultMessage={`<p>Engineering team,</p>
<p>Unfortunately, due to a scheduling conflict with an executive retreat, Ilano is not available for the previously planned meet &amp; greet today.</p>
<p>We will reschedule for next week, at which point you can submit questions for him to answer.</p>
<p>Sorry for the late notice!</p>
<p>-Mary</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s28_0",
        from: Contacts.owner,
        subject: <FormattedMessage
            id="mails28_0Subject"
            description="Subject line for story mail s28_0"
            defaultMessage="UNACCEPTABLE!"
            />,
        create: (context) => <FormattedMessage
            id="mails28_0Content"
            description="HTML content for story mail s28_0"
            defaultMessage={`<p>Mary,</p>
<p>The food at the executive retreat was absolutely horrible. I don't know how these events worked before, but I always treat my executives to the finest culinary delights the world has to offer.</p>
<p>The caviar was almost inedible (definitely <em>not</em> the Caspian Sea beluga caviar I had specifically requested), and the cocktail weenies were similarly unpalatable (anything less than Boar's Pride should go in the dumpster).</p>
<p>What a disgrace!</p>
<p>-Ilano</p>
<p>P.S. Please reject all meeting requests with staff for the rest of the week. And please come up with convincing excuses this time!</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s29_0",
        from: Contacts.assistant,
        subject: <FormattedMessage
            id="mails29_0Subject"
            description="Subject line for story mail s29_0"
            defaultMessage="Clarification"
            />,
        create: (context) => <FormattedMessage
            id="mails29_0Content"
            description="HTML content for story mail s29_0"
            defaultMessage={`<p>Engineering team,</p>
<p>Please disregard the previous errant electronic mail that was purportedly sent by Ilano. That mail was apparently actually sent by a rogue human resources employee, Mary Townsend (who has since been fired).</p>
<p>Ilano treats all employees with dignity and respect, and would never complain about a matter so trivial as food catering at a meeting. He understands that budget cuts are difficult and, in fact, he has willingly slashed his own salary by 10% in solidarity with all SIC Systems staff.</p>
<p>Thank you, and have a great day!</p>
<p>-Jeffrey</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s2_0",
        from: Contacts.badManager,
        subject: <FormattedMessage
            id="mails2_0Subject"
            description="Subject line for story mail s2_0"
            defaultMessage="Good news!"
            />,
        create: (context) => <FormattedMessage
            id="mails2_0Content"
            description="HTML content for story mail s2_0"
            defaultMessage={`<p>{selfName},</p>
<p>After talking with Rick, we've decided that it's not fair to make you complete training without compensating you. Hopefully your sitting down for this, because I've got some thrilling news.</p>
<p><strong>We're providing free pizza lunches to all trainees!</strong></p>
<p>See? I told you I'd make it up to you.</p>
<p>Thanks for working hard!</p>
<p>-Don</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s2_1",
        from: Contacts.flunky,
        subject: <FormattedMessage
            id="mails2_1Subject"
            description="Subject line for story mail s2_1"
            defaultMessage="Help!"
            />,
        create: (context) => <FormattedMessage
            id="mails2_1Content"
            description="HTML content for story mail s2_1"
            defaultMessage={`<p>Hi, {selfName}, I'm Ted. We met in the hallway earlier.</p>
<p>Is there any chance you could come over to my cubicle and help me with the first assessment? I'd ask Feng for help, but I haven't seen him around yet this morning.</p>
<p>Yesterday, Feng mentioned something about just using a label that initially points to the value zero, but what does that even mean??? He also said something about being able to reset a variable back to zero by subtracting itself. Is that a thing? I'm so lost!</p>
<p>Thanks for your time!</p>
<p>-Ted</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s30_0",
        from: Contacts.owner,
        subject: <FormattedMessage
            id="mails30_0Subject"
            description="Subject line for story mail s30_0"
            defaultMessage="Unbelievable work!"
            />,
        create: (context) => <FormattedMessage
            id="mails30_0Content"
            description="HTML content for story mail s30_0"
            defaultMessage={`<p>Truly amazing work, {selfName}!</p>
<p>Thank you from the bottom of my heart for all of the sacrifices you've made to get us to this point. The SIC-1 is now able to reason about its own code. This is an amazing breakthrough and you should be very proud.</p>
<p>Now that we've reached this exciting milestone (thanks to your tireless efforts!), SIC Systems honestly can't challenge someone with your peerless talent. Excitingly, you can now begin the next phase of your career at one of the many other technology companies around the world. I know parting ways is tough, but SIC Systems is a business, not a family, so we have to say goodbye to employees once they're no longer needed. Thank you one last time, and best of luck in your future endeavors!</p>
<p>-Ilano</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s31_0",
        from: Contacts.goodManager2,
        subject: <FormattedMessage
            id="mails31_0Subject"
            description="Subject line for story mail s31_0"
            defaultMessage="Great to hear from you!"
            />,
        create: (context) => <FormattedMessage
            id="mails31_0Content"
            description="HTML content for story mail s31_0"
            defaultMessage={`<p>{selfName},</p>
<p>It's great to hear from you!</p>
<p>I heard that SIC Systems let you go immediately after you demoed your (incomplete) self-hosting program. Ilano is going to be kicking himself when he realizes that the implementation SIC Systems owns doesn't support self-modifying code!</p>
<p>Now that you're solely in possession of the only <em>truly</em> self-hosting program for the SIC-1, my advice is: destroy it. Erase all copies, set them on fire, and bury the ashes out in the desert. Ilano doesn't deserve to ever take advantage of your work again.</p>
<p>Speaking of work, I wanted to let you know that I found a job at a small startup that is working on a home computer with a graphical interface. It's revolutionary stuff, and we need someone with your technical skills to go to market.</p>
<p>Is there any chance you'd be open to discussing a lead engineering position over here?</p>
<p>If you're interested, let me know and I'll schedule a meeting with us and the two remaining founders (both named Steve, by coincidence).</p>
<p>Hope to hear from you soon!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name }}
            />,
        actions: [
            "credits"
        ],
    },


    {
        id: "s3_0",
        from: Contacts.hr,
        subject: <FormattedMessage
            id="mails3_0Subject"
            description="Subject line for story mail s3_0"
            defaultMessage="Training complete!"
            />,
        create: (context) => <FormattedMessage
            id="mails3_0Content"
            description="HTML content for story mail s3_0"
            defaultMessage={`<p>Thanks for completing your training, {selfName}! Your starting job title is: <strong>{jobTitle}</strong>.</p>
<p>Your finalized compensation package is described in the packet I left on your desk. As always, let me know if you have any questions.</p>
<p>Thank you!</p>
<p>-Mary</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[1].title }}
            />,
    },


    {
        id: "s3_1",
        from: Contacts.mentor,
        subject: <FormattedMessage
            id="mails3_1Subject"
            description="Subject line for story mail s3_1"
            defaultMessage="My mental model for SIC-1"
            />,
        create: (context) => <FormattedMessage
            id="mails3_1Content"
            description="HTML content for story mail s3_1"
            defaultMessage={`<p>Greetings, {selfName}. I'm also on Don's team and my name is Feng. Let me know if you ever need any assistance.</p>
<p>After helping Ted with the first assessment, I thought I'd share my perspective on how to think about SIC-1 Assembly Language:</p>
<ul>
<li><strong>Addresses</strong> are just numbers that identify a specific byte of memory (0 for the first byte, 1 for the second, and so on, up to 255)</li>
<li><strong>Labels</strong> are just names for addresses--specifically, the address of whatever comes next in your code (whether it's a <code>subleq</code> or a <code>.data</code>)</li>
<li><code>subleq</code> always compiles into 3 bytes (each one an address)--if you omit the third address, it just gets set to the address of the next instruction in memory</li>
<li><code>.data</code> just sets one or more bytes of memory to specific values (positive or negative numbers, or even labels, i.e. addresses)</li>
</ul>
<p>In the end, everything compiles down to bytes in memory (which you can see in the memory table after you click "Compile" or "Run" to load the program). While running, the SIC-1 only sees those bytes in memory, and it doesn't know or care how those bytes were produced (or even modified). It will happily interpret any 3 bytes as a <code>subleq</code> instruction--even if that's not what you intended.</p>
<p>It can be instructive to look at a chunk of code and see the resulting compiled bytes. Here's an example:</p>
<pre><code>@loop:
subleq @OUT, @IN           ; 3 byte instruction stored at address 0
subleq @zero, @zero, @loop ; 3 byte instruction stored at address 3

@zero: .data 0             ; Initializes address 6 to zero
</code></pre>
<ul>
<li><code>@loop</code> refers to address 0, i.e. the first instruction</li>
<li>The first <code>subleq</code> occupies bytes 0, 1, and 2, and is compiled to: 254 (<code>@OUT</code>), 253 (<code>@IN</code>), 3 (the next instruction)</li>
<li>The second <code>subleq</code> occupies bytes 3, 4, and 5, and is compiled to: 6 (<code>@zero</code>), 6 (<code>@zero</code>), 0 (<code>@loop</code>)</li>
<li><code>@zero</code> refers to address 6, i.e. the next byte (which is initialized to zero using the <code>.data</code> directive)</li>
</ul>
<p>As you know by now, the first instruction negates an input and writes it out, then advances to the next instruction (regardless of the result). The second instruction subtracts the value at address 6 from itself, always resulting in zero, and thus always jumps to its third argument: <code>@loop</code>, i.e. address 0 (the beginning of the program).</p>
<p>Hope that helps!</p>
<p>-Feng</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s4_0",
        from: Contacts.badManager,
        subject: <FormattedMessage
            id="mails4_0Subject"
            description="Subject line for story mail s4_0"
            defaultMessage="Checking in"
            />,
        create: (context) => <FormattedMessage
            id="mails4_0Content"
            description="HTML content for story mail s4_0"
            defaultMessage={`<p>Hey, {selfName}! How's it feel to be a full-time employee working on the cutting edge of revolutionary technology? Only a single instruction! Amazing!</p>
<p>Anyway, I did see your question about the compensation package Mary provided to you. I apologize if the pay is lower than what you were expecting. Another HR mix-up! What can I say?</p>
<p>I'll talk to Rick to see if we can make an exception and raise your pay immediately, but just keep in mind that this company has a lot of room to grow, so your hard efforts will be very well rewarded!</p>
<p>-Don</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s4_1",
        from: Contacts.mentor,
        subject: <FormattedMessage
            id="mails4_1Subject"
            description="Subject line for story mail s4_1"
            defaultMessage="Sandbox Mode"
            />,
        create: (context) => <FormattedMessage
            id="mails4_1Content"
            description="HTML content for story mail s4_1"
            defaultMessage={`<p>Greetings, {selfName}.</p>
<p>I wanted to share with you a little side project I've been working on. I'm calling in "Sandbox Mode". Basically, it's a special SIC-1 Emulator mode that allows you to specify your own input.</p>
<p>This is useful when you just want to play around with the SIC-1 to see how things work. You can experiment with this to test out new techniques without worrying about output getting flagged as incorrect.</p>
<p>Sandbox Mode should be visible up in your Program Inventory under the "Diversions" group.</p>
<p>Let me know what you think!</p>
<p>-Feng</p>
`}
            values={{ selfName: context.self.name }}
            />,
        actions: [
            "sandbox"
        ],
    },


    {
        id: "s5_0",
        from: Contacts.mentor,
        subject: <FormattedMessage
            id="mails5_0Subject"
            description="Subject line for story mail s5_0"
            defaultMessage="Constants"
            />,
        create: (context) => <FormattedMessage
            id="mails5_0Content"
            description="HTML content for story mail s5_0"
            defaultMessage={`<p>Greetings, {selfName}.</p>
<p>After talking to Ted, I thought this might be a good time to remind everyone that you can use labels for both variables <em>and constants</em>. A label is really just an address, after all.</p>
<p>For example, if I want to be able to write out a 1, I could create a constant. Just remember that if you're subtracting the constant you'll want to negate the constant:</p>
<pre><code>subleq @OUT, @n_one ; Write out a 1 by subtracting -1 from @OUT
                    ; Note: @OUT always reads as zero: 0 - (-1) = 1

@n_one: .data -1    ; Constant
</code></pre>
<p>-Feng</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s6_0",
        from: Contacts.flunky1,
        subject: <FormattedMessage
            id="mails6_0Subject"
            description="Subject line for story mail s6_0"
            defaultMessage="Loops???"
            />,
        create: (context) => <FormattedMessage
            id="mails6_0Content"
            description="HTML content for story mail s6_0"
            defaultMessage={`<p>{selfName}, I'm really stuck! Do you have any time to come help me with the multiplication task?</p>
<p>I already asked Feng for some help, but all he told me is that I could run a loop a specific number of times by subtracting 1 from a counter each time and then using the result to branch.</p>
<p>What does that even mean???</p>
<p>-Ted</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s7_0",
        from: Contacts.goodManager,
        subject: <FormattedMessage
            id="mails7_0Subject"
            description="Subject line for story mail s7_0"
            defaultMessage="Nice work!"
            />,
        create: (context) => <FormattedMessage
            id="mails7_0Content"
            description="HTML content for story mail s7_0"
            defaultMessage={`<p>Hi, {selfName}! I'm Pat and I'm another engineering lead (I actually work on the same team as your manager, Don).</p>
<p>Feng (who used to report to me) mentioned that you've been making excellent progress!</p>
<p>Anyway, I've been tasked with helping to improve morale across the team, so if there's anything that you especially like or don't like about the workplace or your compensation (or your team in general), feel free to send me a mail. I'll make sure to keep all discussions private.</p>
<p>Looking forward to hearing from you!</p>
<p>-Pat</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s7_1",
        from: Contacts.hr,
        subject: <FormattedMessage
            id="mails7_1Subject"
            description="Subject line for story mail s7_1"
            defaultMessage="Fun and games"
            />,
        create: (context) => <FormattedMessage
            id="mails7_1Content"
            description="HTML content for story mail s7_1"
            defaultMessage={`<p>Engineering team,</p>
<p>To help improve morale, SIC Systems has provided an officially sanctioned computer video game called "Avoision" for employees to play. If you think your work would benefit from an entertaining diversion, please feel free to compete against your coworkers for the highest score in "Avoision" (during your two legally-mandated unpaid breaks, or in lieu of an unneeded bathroom break).</p>
<p>You can find "Avoision" in the "Diversions" section of the program inventory and also in the main menu of the SIC-1 Development Environment.</p>
<p>Enjoy!</p>
<p>-Mary</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },


    {
        id: "s8_0",
        from: Contacts.badManager,
        subject: <FormattedMessage
            id="mails8_0Subject"
            description="Subject line for story mail s8_0"
            defaultMessage="Great start!"
            />,
        create: (context) => <FormattedMessage
            id="mails8_0Content"
            description="HTML content for story mail s8_0"
            defaultMessage={`<p>Nice work on the arithmetic programs, {selfName}! As of this electronic mail, you have been promoted to <strong>{jobTitle}</strong>.</p>
<p>I know it's getting late (and please try to keep this to yourself), but our team really needs to improve our velocity. If there's any way you can stay late and complete your next task <em>today</em>, there is a very good chance that I'll be able to promote you to Senior Engineer (and that comes with a hefty pay bump).</p>
<p>Again, keep this to yourself. This sort of rapid promotion is extremely rare. Obviously, I can't guarantee anything, but if you can knuckle down and churn out this next task, things are looking pretty good...</p>
<p>Thank you!</p>
<p>-Don</p>
`}
            values={{ selfName: context.self.name, jobTitle: Shared.jobTitles[2].title }}
            />,
    },


    {
        id: "s9_0",
        from: Contacts.skip,
        subject: <FormattedMessage
            id="mails9_0Subject"
            description="Subject line for story mail s9_0"
            defaultMessage="Congratulations, Don!"
            />,
        create: (context) => <FormattedMessage
            id="mails9_0Content"
            description="HTML content for story mail s9_0"
            defaultMessage={`<p>Don (and Don's team),</p>
<p>In recognition of Don's tireless efforts that have recently culminated in the ability of the SIC-1 to process sequences, I'd like everyone to join me in congratulating Don on his promotion to Principal Engineering Lead!</p>
<p>Don, I don't know how you managed to get sequences up and running so quickly, but we all owe a great debt to you.</p>
<p>Thank you once again!</p>
<p>-Rick</p>
`}
            values={{ selfName: context.self.name }}
            />,
    },

];
