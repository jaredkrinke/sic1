import { Component, ComponentChildren } from "preact";
import { Button } from "./button";

export interface MessageBoxContent {
    title: string;
    modal?: boolean;
    wide?: boolean;
    body: ComponentChildren;
}

interface MessageBoxProperties extends MessageBoxContent {
    onDismissed: () => void;
}

export class MessageBox extends Component<MessageBoxProperties> {
    constructor(props: MessageBoxProperties) {
        super(props);
    }

    private close = () => {
        if (this.props.modal !== true) {
            this.props.onDismissed();
        }
    }

    public render() {
        return <>
            <div className="centerContainer">
                <div className={`messageBox ${this.props.wide ? "messageBoxWide" : "messageBoxNarrow"}`}>
                    <div className="messageHeader">
                        {this.props.title}
                        {this.props.modal === true ? null : <Button className="messageClose" onClick={this.close} title="Esc">X</Button>}
                    </div>
                    <div className="messageBody">
                        {this.props.body}
                    </div>
                </div>
                <div className="dimmer" onClick={this.close}></div>
            </div>
        </>;
    }
}
