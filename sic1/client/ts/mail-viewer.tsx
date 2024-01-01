import React from "react";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Contact, Contacts, formatContact, formatContactWithoutTitle } from "./contacts";
import { Inbox, Sic1DataManager, UserData } from "./data-manager";
import { ensureMailRead, mails } from "./mail";
import { PuzzleListTypes } from "./puzzle-list";
import { ClientPuzzle, puzzleSandbox } from "./puzzles";
import { Shared } from "./shared";
import { Mail } from "./mail-shared";
import { FormattedMessage } from "react-intl";

interface MailViewerProps {
    mails: Inbox;
    initialMailId?: string;
    currentPuzzleTitle: string;
    titleToClientPuzzle: { [title: string]: ClientPuzzle };
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
    titleToClientPuzzle: { [title: string]: ClientPuzzle };
    onMailRead: (id: string) => void;
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
        const { to, from } = this.props.mail;

        // A bit of a hack, but try to detect the solved count for this mail and display the corresponding job title
        const { solvedCount } = this.props.mail;
        const self: Contact = {
            name: this.props.data.name,
            title: Shared.getJobTitleForSolvedCount(solvedCount ?? this.props.data.solvedCount),
        };

        const toFragment = to
            ? <>{joinJsx(to.map(c => (c === "self"
                ? formatContact(self)
                : formatContact(Contacts[c]))), <><br/><FormattedMessage id="mailViewerExtraToLineIndent" description="Optional indent using {nbsp} non-breaking spaces to line up with 'from' line" defaultMessage="{nbsp}{nbsp}{nbsp}{nbsp}{nbsp} " values={{nbsp: <>&nbsp;</>}}/></>)}{to.length > 1 ? <br/> : null}</>
            : formatContact(self);

        return <>
            <header>
                <FormattedMessage
                    id="mailViewerMailHeading"
                    description="Heading content markup shown in the mail viewer for a particular mail (optionally use {nbsp} non-breaking spaces to line up 'to' and 'from' lines); use {newline} at the end of each line"
                    defaultMessage="TO:{nbsp}{nbsp} {to}{newline}FROM: {from}{newline}{newline}SUBJECT: {subject}{newline}"
                    values={{
                        nbsp: <>&nbsp;</>,
                        newline: <br/>,
                        to: toFragment,
                        from: formatContact(from),
                        subject: formatSubject(this.props.mail, this.props.titleToClientPuzzle),
                    }}
                    />
            </header>
            {this.props.mail.create({
                self,
                from: this.props.mail.from,
                jobTitles: Shared.jobTitles,
            })}
        </>
    }
}

type MailItem = Mail & BrowserItem & { read: boolean };

function formatSubject(mail: Mail, titleToClientPuzzle: { [title: string]: ClientPuzzle }): React.ReactNode {
    return (mail.loadType === "puzzle")
        ? <FormattedMessage
            id="mailViewerTaskSubject"
            description="Subject line for task completion mails"
            defaultMessage="RE: {taskName}"
            values={{ taskName: titleToClientPuzzle[mail.id].displayTitle }}
            />
        : mail.subject;
}

export class MailViewer extends React.Component<MailViewerProps, { selection: BrowserIndices }> {
    private groups: { title: React.ReactNode, items: MailItem[] }[];

    constructor(props) {
        super(props);

        const mail: MailItem[] = this.props.mails.map(m => {
            const mail = mails[m.id];
            const viewNextTask = {
                title: <FormattedMessage
                    id="mailViewerButtonNextTask"
                    description="Button text for the 'view next task' button in the mail viewer"
                    defaultMessage="View Next Task"
                    />,
                intent: "View Next Task",
                onClick: () => this.props.onNextPuzzleRequested()
            };

            const actionToButton = {
                manual: {
                    title: <FormattedMessage
                    id="mailViewerButtonOpenManual"
                    description="Button text for the 'open manual in-game' button in the mail viewer"
                    defaultMessage="Open Manual In-Game"
                    />,
                    onClick: () => this.props.onManualInGameRequested()
                },
                manualInNewWindow: {
                    title: <FormattedMessage
                    id="mailViewerButtonOpenManualNewWindow"
                    description="Button text for the 'open manual in new window' button in the mail viewer"
                    defaultMessage="Open Manual in New Window"
                    />,
                    onClick: () => this.props.onManualInNewWindowRequested()
                },
                credits: {
                    title: <FormattedMessage
                    id="mailViewerButtonCredits"
                    description="Button text for the 'view credits' button in the mail viewer"
                    defaultMessage="View Credits"
                    />,
                    onClick: () => this.props.onCreditsRequested()
                },
                sandbox: {
                    title: <FormattedMessage
                    id="mailViewerButtonSandbox"
                    description="Button text for the 'view sandbox mode' button in the mail viewer"
                    defaultMessage="View Sandbox Mode"
                    />,
                    onClick: () => this.props.onPuzzleListRequested("puzzle", puzzleSandbox.title)
                },
            };
            
            return  {
                ...mail,
                title: formatSubject(mail, this.props.titleToClientPuzzle),
                subtitle: <>&nbsp;{formatContactWithoutTitle(mail.from)}</>,
                read: m.read,
                buttons: [
                    ...((mail.loadType && mail.loadLabel) ? [{ title: mail.loadLabel, onClick: () => this.props.onPuzzleListRequested(mail.loadType) }] : []),
                    ...((mail.loadType === "puzzle")
                        ? ((mail.id === this.props.currentPuzzleTitle)
                            ? (this.props.onNextPuzzleRequested ? [viewNextTask] : [])
                            : [{
                                title: <FormattedMessage
                                    id="mailViewerButtonViewTask"
                                    description="Button text for the 'view a specific task' button in the mail viewer"
                                    defaultMessage="View {taskName}"
                                    values={{ taskName: this.props.titleToClientPuzzle[mail.id]?.displayTitle }}
                                    />,
                                onClick: () => this.props.onPuzzleListRequested(mail.loadType, mail.id)
                                }])
                        : (this.props.onNextPuzzleRequested ? [viewNextTask] : [])),
                    ...((mail.id === this.props.currentPuzzleTitle)
                        ? [{
                                title: <FormattedMessage
                                    id="mailViewerButtonContinueEditing"
                                    description="Button text for the 'continue editing' button in the mail viewer"
                                    defaultMessage="Continue Editing Current Program"
                                    />,
                                onClick: () => this.props.onClearMessageBoxRequested()
                            }]
                        : []),
                    ...((mail.actions?.map(id => actionToButton[id]) ?? [])),
                ],
            };
        });

        const unreadMails = mail.filter(m => !m.read);
        const readMails = mail.filter(m => m.read);

        // Replace "view next task" with "next unread mail" button for  all but the last unread mail
        for (let i = 0; i < unreadMails.length - 1; i++) {
            const unreadMail = unreadMails[i];
            if (unreadMail.buttons[0]?.intent === "View Next Task") {
                unreadMail.buttons.splice(0, 1);
            }

            unreadMail.buttons.unshift({
                title: <FormattedMessage
                    id="mailViewerViewNextUnread"
                    description="Button text for the 'view next unread mail' button in the mail viewer"
                    defaultMessage="View Next Unread Mail"
                    />,
                onClick: () => this.setState({ selection: { groupIndex: 0, itemIndex: i + 1 } }),
            });
        }

        this.groups = [];
        if (unreadMails.length > 0) {
            this.groups.push({
                title: <FormattedMessage
                    id="mailViewerGroupUnread"
                    description="Group heading for 'unread mail' in the mail viewer"
                    defaultMessage="Unread Mail"
                    />,
                items: unreadMails,
            });
        }

        this.groups.push({
            title: this.groups.length === 0
                ? <FormattedMessage
                    id="mailViewerHeadingUnread"
                    description="Mail viewer heading for unread mail"
                    defaultMessage="Inbox"
                    />
                : <FormattedMessage
                    id="mailViewerHeadingRead"
                    description="Mail viewer heading for mail that has already been read"
                    defaultMessage="Read Mail"
                    />,
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
                titleToClientPuzzle={this.props.titleToClientPuzzle}
                onMailRead={this.props.onMailRead}
                />
        </Browser>;
    }
}
