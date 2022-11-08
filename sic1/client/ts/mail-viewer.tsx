import { Component, ComponentChild, ComponentChildren } from "preact";
import { Puzzle } from "sic1-shared";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Contact, Contacts } from "./contacts";
import { Inbox, Sic1DataManager, UserData } from "./data-manager";
import { ensureMailRead, Mail, mails } from "./mail";
import { Shared } from "./shared";

interface MailViewerProps {
    mails: Inbox;
    initialMailId?: string;
    currentPuzzleTitle: string;
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
    onClearMessageBoxRequested: () => void;
    onNextPuzzleRequested?: () => void;
}

interface MailViewProps {
    mail: Mail;
    data: UserData;
    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
}

function formatContactWithoutTitle(contact: Contact): string {
    return `${contact.name}${contact.lastName ? ` ${contact.lastName}` : ""}`;
}

function formatContact(contact: Contact): string {
    return `${formatContactWithoutTitle(contact)}${contact.title ? ` (${contact.title})` : ""}`;
}

function joinJsx(array: ComponentChild[], separator: ComponentChildren): ComponentChildren {
    const result: ComponentChild[] = [];
    let addSeparator = false;
    for (const child of array) {
        if (addSeparator) {
            result.push(separator);
        } else {
            addSeparator = true;
        }
        result.push(child);
    }
    return result;
}

class MailView extends Component<MailViewProps> {
    public componentDidMount(): void {
        ensureMailRead(this.props.mail);
    }

    public render(): ComponentChild {
        const { onLoadPuzzleRequested } = this.props;
        const { to, from, subject } = this.props.mail;
        const self: Contact = {
            name: this.props.data.name,
            title: Shared.getJobTitleForSolvedCount(this.props.data.solvedCount),
        };
        
        return <>
            <header>
                TO:&nbsp;&nbsp; {to ? <>{joinJsx(to.map(c => (c === "self" ? formatContact(self) : formatContact(Contacts[c]))), <><br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </>)}{to.length > 1 ? <br/> : null}</> : formatContact(self)}<br/>
                FROM: {formatContact(from)}<br />
                <br/>
                SUBJECT: {subject}<br />
            </header>
            {this.props.mail.create({
                self,
                from: this.props.mail.from,
                jobTitles: Shared.jobTitles,
            })}
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
                subtitle: <>&nbsp;{formatContactWithoutTitle(mail.from)}</>,
                read: m.read,
                buttons: [
                    ...((this.props.onNextPuzzleRequested) ? [{ title: "View Next Task", onClick: () => this.props.onNextPuzzleRequested() }] : []),
                    ...((mail.id === this.props.currentPuzzleTitle) ? [{ title: "Continue Editing Current Program", onClick: () => this.props.onClearMessageBoxRequested() }] : []),
                ],
            };
        });

        const unreadMails = mail.filter(m => !m.read);
        const readMails = mail.filter(m => m.read);

        let initialItemIndex = unreadMails.findIndex(m => m.id === this.props.initialMailId);
        if (initialItemIndex < 0) {
            initialItemIndex = undefined;
        }

        // Replace "view next task" with "next unread mail" button for  all but the last unread mail
        for (let i = 0; i < unreadMails.length - 1; i++) {
            const unreadMail = unreadMails[i];
            if (unreadMail.buttons[0].title === "View Next Task") {
                unreadMail.buttons.splice(0, 1);
            }

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

        // Select an item by default, if none was specified (or found)
        if (initialItemIndex === undefined) {
            // If there are unread mails, open the first one; if not open the last mail
            initialItemIndex = (unreadMails.length === 0) ? readMails.length - 1 : 0;
        }

        this.state = { selection: { groupIndex, itemIndex: initialItemIndex }};
    }

    public render(): ComponentChild {
        const { groupIndex, itemIndex } = this.state.selection;
        const mail = this.groups[groupIndex].items[itemIndex];
        return <Browser className="mailBrowser" groups={this.groups}  selection={this.state.selection} onSelectionChanged={(selection) => this.setState({ selection })}>
            <MailView key={mail.id} mail={mail} data={Sic1DataManager.getData()} onLoadPuzzleRequested={this.props.onLoadPuzzleRequested} />
        </Browser>;
    }
}
