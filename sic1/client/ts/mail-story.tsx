import React from "react";
import { Contacts } from "./contacts";
import { FormattedMessage } from "react-intl";
import { Mail } from "./mail-shared";

export const storyMailContents: Mail[] = [
    {
        id: "s0_2",
        from: Contacts.hr,
        subject: <FormattedMessage
            id="mailS0_2Subject"
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
<p>-Mary</p>`}
            values={{selfName: context.self.name}}
            />,
        actions: [
            "manual",
            "manualInNewWindow",
        ],
    }
];
