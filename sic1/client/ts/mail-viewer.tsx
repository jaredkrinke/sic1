import { Component, ComponentChild, ComponentChildren } from "preact";
import { Puzzle } from "sic1-shared";
import { Sic1DataManager } from "./data-manager";
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

    public render(): ComponentChild {
        const data = Sic1DataManager.getData();
        const self: Contact = {
            name: data.name,
            title: Shared.getJobTitleForSolvedCount(data.solvedCount),
        };

        const mail = this.mails[this.state.index];
        const { onLoadPuzzleRequested } = this.props;

        if (!mail) {
            return <p>You have no electronic mail.</p>;
        }

        return <div className="mailViewer">
            <div className="mailList">{this.mails.map((mail, index) => <>
                <div className={this.state.index === index ? "selected" :""} onClick={() => this.setState({ index })}>
                    <p>{mail.subject}</p>
                    <p class="sub">&nbsp;{mail.from.name}</p>
                </div>
            </>).reverse()}</div>
            <div className="mailView">
                <header>{MailViewer.createMessageHeader(`${self.name} (${self.title})`, `${mail.from.name} (${mail.from.title})`, mail.subject)}</header>
                {mail.create(self, { onLoadPuzzleRequested } )}
            </div>
        </div>;
    }
}
