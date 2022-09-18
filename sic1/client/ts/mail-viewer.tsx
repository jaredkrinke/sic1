import { Component, ComponentChild, ComponentChildren } from "preact";
import { Puzzle } from "sic1-shared";
import { Browser, BrowserGroup, BrowserItem } from "./browser";
import { Inbox, UserData } from "./data-manager";
import { Contact, ensureMailRead, Mail, mails } from "./mail";
import { Shared } from "./shared";

interface MailViewerProps {
    mails: Inbox;
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
}

class MailComponent extends Component<{ mail: Mail, data: UserData, onLoadPuzzleRequested: (puzzle: Puzzle) => void }> {
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
            <header>{MailViewer.createMessageHeader(`${self.name} (${self.title})`, `${this.props.mail.from.name} (${this.props.mail.from.title})`, this.props.mail.subject)}</header>
            {this.props.mail.create(self, { onLoadPuzzleRequested } )}
        </>;
    }
}

type MailItem = Mail & BrowserItem & { read: boolean };

export class MailViewer extends Component<MailViewerProps, { index: number }> {
    private unreadMails: MailItem[];
    private readMails: MailItem[];

    constructor(props) {
        super(props);
        this.state = { index: this.props.mails.length - 1 };

        const mail = this.props.mails.map(m => {
            const mail = mails[m.id];
            return  {
                ...mail,
                title: mail.subject,
                subtitle: <>&nbsp;{mail.from.name}</>,
                read: m.read,
            };
        });

        this.unreadMails = mail.filter(m => !m.read);
        this.readMails = mail.filter(m => m.read);
    }

    public static createMessageHeader(to: string, from: string, subject: string): ComponentChildren {
        return <>
            TO:&nbsp;&nbsp; {to}<br />
            FROM: {from}<br />
            <br/>
            SUBJECT: {subject}<br />
        </>;
    }

    private renderMail(mail: Mail, data: UserData): ComponentChild {
        if (!mail) {
            return <p>You have no electronic mail.</p>;
        } else {
            return <MailComponent mail={mail} data={data} onLoadPuzzleRequested={this.props.onLoadPuzzleRequested} />;
        }
    }

    public render(): ComponentChild {
        const groups: BrowserGroup<MailItem>[] = [];
        if (this.unreadMails.length > 0) {
            groups.push({
                title: "Unread Mail",
                items: this.unreadMails,
            });
        }

        groups.push({
            title: groups.length === 0 ? "Inbox" : "Read Mail",
            items: this.readMails,
        });

        // Always open to the first group
        const groupIndex = 0;

        // If there are unread mails, open the first one; if not open the last mail
        const itemIndex = (groups.length === 1) ? groups[0].items.length - 1 : 0;

        return <Browser<Mail & BrowserItem> className="mailBrowser" groups={groups} initial={{ groupIndex, itemIndex }} renderItem={(item, data) => this.renderMail(item, data)} />;
    }
}
