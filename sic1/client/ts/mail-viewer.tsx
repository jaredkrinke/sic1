import React from "react";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Contact, Contacts } from "./contacts";
import { Inbox, Sic1DataManager, UserData } from "./data-manager";
import { ensureMailRead, mails } from "./mail";
import { PuzzleListTypes } from "./puzzle-list";
import { puzzleSandbox } from "./puzzles";
import { Shared } from "./shared";
import { Mail } from "./mail-shared";

interface MailViewerProps {
    mails: Inbox;
    initialMailId?: string;
    currentPuzzleTitle: string;
    onClearMessageBoxRequested: () => void;
    onNextPuzzleRequested?: () => void;
    onPuzzleListRequested: (type: PuzzleListTypes, title?: string) => void;
    onCreditsRequested: () => void;
    onManualInGameRequested: () => void;
    onManualInNewWindowRequested: () => void;
    onMailRead: (id: string) => void;
}

interface MailViewProps {
    mail: Mail;
    data: UserData;
    onMailRead: (id: string) => void;
}

function formatContactWithoutTitle(contact: Contact): string {
    return `${contact.name}${contact.lastName ? ` ${contact.lastName}` : ""}`;
}

function formatContact(contact: Contact): string {
    return `${formatContactWithoutTitle(contact)}${contact.title ? ` (${contact.title})` : ""}`;
}

function joinJsx(array: React.ReactNode[], separator: React.ReactNode): React.ReactNode {
    const result: React.ReactNode[] = [];
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

class MailView extends React.Component<MailViewProps> {
    public componentDidMount(): void {
        ensureMailRead(this.props.mail);
        this.props.onMailRead(this.props.mail.id);
    }

    public render(): React.ReactNode {
        const { to, from, subject } = this.props.mail;

        // A bit of a hack, but try to detect the solved count for this mail and display the corresponding job title
        const { solvedCount } = this.props.mail;
        const self: Contact = {
            name: this.props.data.name,
            title: Shared.getJobTitleForSolvedCount(solvedCount ?? this.props.data.solvedCount),
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

export class MailViewer extends React.Component<MailViewerProps, { selection: BrowserIndices }> {
    private groups: { title: string, items: MailItem[] }[];

    constructor(props) {
        super(props);

        const mail: MailItem[] = this.props.mails.map(m => {
            const mail = mails[m.id];
            const viewNextTask = { title: "View Next Task", onClick: () => this.props.onNextPuzzleRequested() };
            const actionToButton = {
                manual: { title: "Open Manual In-Game", onClick: () => this.props.onManualInGameRequested() },
                manualInNewWindow: { title: "Open Manual in New Window", onClick: () => this.props.onManualInNewWindowRequested() },
                credits: { title: "View Credits", onClick: () => this.props.onCreditsRequested() },
                sandbox: { title: "View Sandbox Mode", onClick: () => this.props.onPuzzleListRequested("puzzle", puzzleSandbox.title) },
            };
            
            return  {
                ...mail,
                title: mail.subject,
                subtitle: <>&nbsp;{formatContactWithoutTitle(mail.from)}</>,
                read: m.read,
                buttons: [
                    ...((mail.loadType && mail.loadLabel) ? [{ title: mail.loadLabel, onClick: () => this.props.onPuzzleListRequested(mail.loadType) }] : []),
                    ...((mail.loadType === "puzzle")
                        ? ((mail.id === this.props.currentPuzzleTitle)
                            ? (this.props.onNextPuzzleRequested ? [viewNextTask] : [])
                            : [{ title: `View ${mail.id}`, onClick: () => this.props.onPuzzleListRequested(mail.loadType, mail.id)}])
                        : (this.props.onNextPuzzleRequested ? [viewNextTask] : [])),
                    ...((mail.id === this.props.currentPuzzleTitle) ? [{ title: "Continue Editing Current Program", onClick: () => this.props.onClearMessageBoxRequested() }] : []),
                    ...((mail.actions?.map(id => actionToButton[id]) ?? [])),
                ],
            };
        });

        const unreadMails = mail.filter(m => !m.read);
        const readMails = mail.filter(m => m.read);

        // Replace "view next task" with "next unread mail" button for  all but the last unread mail
        for (let i = 0; i < unreadMails.length - 1; i++) {
            const unreadMail = unreadMails[i];
            if (unreadMail.buttons[0]?.title === "View Next Task") {
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

        // Select an item by default, if none was specified (or found)
        let { groupIndex, itemIndex } = this.findMailById(this.props.initialMailId);
        if (groupIndex === undefined || itemIndex === undefined) {
            // If there are unread mails, open the first one; if not open the last mail
            groupIndex = 0;
            itemIndex = (unreadMails.length === 0) ? (readMails.length - 1) : 0;
        }

        this.state = { selection: { groupIndex, itemIndex }};
    }

    private findMailById(id: string | undefined): Partial<BrowserIndices> {
        let groupIndex: number;
        let itemIndex: number;
        if (id) {
            for (let g = 0; g < this.groups.length; g++) {
                const items = this.groups[g].items;
                const index = items.findIndex(m => m.id === id);
                if (index >= 0) {
                    groupIndex = g;
                    itemIndex = index;
                    break;
                }
            }
        }

        return { groupIndex, itemIndex };
    }

    public selectMail(mailId: string): void {
        if (mailId) {
            const { groupIndex, itemIndex } = this.findMailById(mailId);
            if (groupIndex !== undefined && itemIndex !== undefined) {
                this.setState({ selection: { groupIndex, itemIndex }});
            }
        }
    }

    public render(): React.ReactNode {
        const { groupIndex, itemIndex } = this.state.selection;
        const mail = this.groups[groupIndex].items[itemIndex];
        return <Browser className="mailBrowser" groups={this.groups}  selection={this.state.selection} onSelectionChanged={(selection) => this.setState({ selection })}>
            <MailView
                key={mail.id}
                mail={mail}
                data={Sic1DataManager.getData()}
                onMailRead={this.props.onMailRead}
                />
        </Browser>;
    }
}
