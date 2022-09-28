import { Component, ComponentChild, ComponentChildren } from "preact";
import { Puzzle } from "sic1-shared";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Inbox, Sic1DataManager, UserData } from "./data-manager";
import { Contact, ensureMailRead, Mail, mails } from "./mail";
import { Shared } from "./shared";

interface MailViewerProps {
    mails: Inbox;
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
    onClearMessageBoxRequested: () => void;
    onNextPuzzleRequested?: () => void;
}

interface MailViewProps {
    mail: Mail;
    data: UserData;
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
}

function formatContact(contact: Contact): string {
    return `${contact.name}${contact.title ? ` (${contact.title})` : ""}`;
}

class MailView extends Component<MailViewProps> {
    public componentDidMount(): void {
        ensureMailRead(this.props.mail);
    }

    public render(): ComponentChild {
        const { onLoadPuzzleRequested } = this.props;
        const self: Contact = {
            name: this.props.data.name,
            title: Shared.getJobTitleForSolvedCount(this.props.data.solvedCount),
        };
        
        return <>
            <header>{MailViewer.createMessageHeader(formatContact(self), formatContact(this.props.mail.from), this.props.mail.subject)}</header>
            {this.props.mail.create(self, { onLoadPuzzleRequested } )}
        </>;
    }
}

type MailItem = Mail & BrowserItem & { read: boolean };

export class MailViewer extends Component<MailViewerProps, { selection: BrowserIndices }> {
    private groups: { title: string, items: MailItem[] }[];

    constructor(props) {
        super(props);

        const mail: MailItem[] = this.props.mails.map(m => {
            const mail = mails[m.id];
            return  {
                ...mail,
                title: mail.subject,
                subtitle: <>&nbsp;{mail.from.name}</>,
                read: m.read,
                buttons: [
                    ...((mail.isSolutionStatisticsMail && Sic1DataManager.getData().solvedCount > 0) ? [{ title: "Continue Editing Current Program", onClick: () => this.props.onClearMessageBoxRequested() }] : []),
                    ...((mail.isSolutionStatisticsMail && this.props.onNextPuzzleRequested) ? [{ title: "View Next Task", onClick: () => this.props.onNextPuzzleRequested() }] : []),
                ],
    };
        });

        const unreadMails = mail.filter(m => !m.read);
        const readMails = mail.filter(m => m.read);

        // Add a "next unread mail" button to all but the last unread mail
        for (let i = 0; i < unreadMails.length - 1; i++) {
            const unreadMail = unreadMails[i];
            unreadMail.buttons.unshift({
                title: "View Next Unread Mail",
                onClick: () => this.setState({ selection: { groupIndex: 0, itemIndex: i + 1 } }),
            });
        }

        this.groups = [];
        if (unreadMails.length > 0) {
            this.groups.push({
                title: "Unread Mail",
                items: unreadMails,
            });
        }

        this.groups.push({
            title: this.groups.length === 0 ? "Inbox" : "Read Mail",
            items: readMails,
        });

        // Always open to the first group
        const groupIndex = 0;

        // If there are unread mails, open the first one; if not open the last mail
        const itemIndex = (unreadMails.length === 0) ? readMails.length - 1 : 0;
        this.state = { selection: { groupIndex, itemIndex }};
    }

    public static createMessageHeader(to: string, from: string, subject: string): ComponentChildren {
        return <>
            TO:&nbsp;&nbsp; {to}<br />
            FROM: {from}<br />
            <br/>
            SUBJECT: {subject}<br />
        </>;
    }

    public render(): ComponentChild {
        const { groupIndex, itemIndex } = this.state.selection;
        const mail = this.groups[groupIndex].items[itemIndex];
        return <Browser className="mailBrowser" groups={this.groups}  selection={this.state.selection} onSelectionChanged={(selection) => this.setState({ selection })}>
            <MailView key={mail.id} mail={mail} data={Sic1DataManager.getData()} onLoadPuzzleRequested={this.props.onLoadPuzzleRequested} />
        </Browser>;
    }
}
