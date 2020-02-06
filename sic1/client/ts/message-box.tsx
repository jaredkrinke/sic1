declare const React: typeof import("react");

export interface MessageBoxContent {
    title: string;
    body: React.ReactFragment;
}

interface MessageBoxProperties extends MessageBoxContent {
    onDismissed: () => void;
}

export class MessageBox extends React.Component<MessageBoxProperties> {
    constructor(props: MessageBoxProperties) {
        super(props);
    }

    private close = () => {
        this.props.onDismissed();
    }

    public render() {
        return <>
            <div className="messageBox">
                <div className="messageHeader">
                    {this.props.title}
                    <button className="messageClose" onClick={this.close} title="Esc">X</button>
                </div>
                <div className="messageBody">
                    {this.props.body}
                </div>
            </div>
            <div className="dimmer" onClick={this.close}></div>
        </>;
    }
}
