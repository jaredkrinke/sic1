import { Component, ComponentChildren } from "preact";
import { Button } from "./button";
import { Shared } from "./shared";

export interface MessageBoxContent {
    title: string;
    menu?: boolean;
    modal?: boolean;
    width?: "none" | "wide" | "narrowByDefault";
    body: ComponentChildren;
}

interface MessageBoxProperties extends MessageBoxContent {
    onDismissed: () => void;
}

export class MessageBox extends Component<MessageBoxProperties> {
    private static readonly menuButtonSelector = ".messageBody button";

    constructor(props: MessageBoxProperties) {
        super(props);
    }

    private close = () => {
        if (this.props.modal !== true) {
            this.props.onDismissed();
        }
    }

    public componentDidMount(): void {
        if (this.props.menu) {
            document.querySelector<HTMLButtonElement>(MessageBox.menuButtonSelector)?.focus?.();
        }
    }

    public render() {
        const width = this.props.width ?? "narrow";
        return <>
            <div className="centerContainer">
                <div className={`messageBox${(this.props.width === "none") ? "" : ` ${width}`}`}>
                    <div className="messageHeader">
                        {this.props.title}
                        {this.props.modal === true ? null : <Button className="messageClose" onClick={this.close} title="Esc">X</Button>}
                    </div>
                    <div className="messageBody" onKeyDown={this.props.menu ? (event) => {
                        const offset = Shared.keyToVerticalOffset[event.key];
                        if (offset) {
                            Shared.focusFromQuery(MessageBox.menuButtonSelector, offset, true);
                            event.preventDefault();
                        }
                    } : null}>
                        {this.props.body}
                    </div>
                </div>
                <div className="dimmer" onClick={this.close}></div>
            </div>
        </>;
    }
}
