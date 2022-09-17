import { Component, ComponentChild, ComponentChildren } from "preact";
import { Puzzle } from "sic1-shared";
import { Browser, BrowserItem } from "./browser";
import { UserData } from "./data-manager";
import { Contact, Mail, mails } from "./mail";
import { Shared } from "./shared";

interface MailViewerProps {
    mails: string[];
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
}

export class MailViewer extends Component<MailViewerProps, { index: number }> {
    private mails: Mail[];

    constructor(props) {
        super(props);
        this.state = { index: this.props.mails.length - 1 };
        this.mails = this.props.mails.map(key => mails[key]);
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
        }

        const { onLoadPuzzleRequested } = this.props;
        const self: Contact = {
            name: data.name,
            title: Shared.getJobTitleForSolvedCount(data.solvedCount),
        };
        
        return <>
            <header>{MailViewer.createMessageHeader(`${self.name} (${self.title})`, `${mail.from.name} (${mail.from.title})`, mail.subject)}</header>
            {mail.create(self, { onLoadPuzzleRequested } )}
        </>;
    }

    public render(): ComponentChild {
        const groups = [
            {
                title: "Inbox",
                items: this.mails.map(m => ({
                    ...m,
                    title: m.subject,
                    subtitle: <>&nbsp;{m.from.name}</>,
                })).reverse(),
            },
        ];

        return <Browser<Mail & BrowserItem> className="mailBrowser" groups={groups} initial={{ groupIndex: 0, itemIndex: 0}} renderItem={(item, data) => this.renderMail(item, data)} />;
    }
}
