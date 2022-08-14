import { Component, ComponentChildren } from "preact";

export interface MessageBoxContent {
    title: string;
    modal?: boolean;
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
            <div className="messageBox">
                <div className="messageHeader">
                    {this.props.title}
                    {this.props.modal === true ? null : <button className="messageClose" onClick={this.close} title="Esc">X</button>}
                </div>
                <div className="messageBody">
                    {this.props.body}
                </div>
            </div>
            <div className="dimmer" onClick={this.close}></div>
        </>;
    }
}
