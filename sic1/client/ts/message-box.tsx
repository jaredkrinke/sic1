import React from "react";
import { Button } from "./button";
import { Shared } from "./shared";

export const MessageBoxBehavior = {
    keyboardNavigationForButtons: 0x1,
    focusFirstButton: 0x2,
} as const;

export const menuBehavior = MessageBoxBehavior.keyboardNavigationForButtons | MessageBoxBehavior.focusFirstButton;

export interface MessageBoxContent {
    title: string;
    behavior?: number, // MessageBoxBehavior
    modal?: boolean;
    transparent?: boolean;
    width?: "none" | "wide" | "narrowByDefault";
    body: React.ReactNode;
}

interface MessageBoxProperties extends MessageBoxContent {
    zIndex: number;
    onDismissed: () => void;
}

export class MessageBox extends React.Component<MessageBoxProperties> {
    private static readonly menuButtonSelector = ".messageBody button";
    private static readonly dimmerZOffset = 5;

    private body = React.createRef<HTMLDivElement>();

    constructor(props: MessageBoxProperties) {
        super(props);
    }

    private close = () => {
        if (this.props.modal !== true) {
            this.props.onDismissed();
        }
    }

    public componentDidMount(): void {
        if ((this.props.behavior & menuBehavior) === menuBehavior) {
            document.querySelector<HTMLButtonElement>(MessageBox.menuButtonSelector)?.focus?.();
        }
    }

    public render() {
        const width = this.props.width ?? "narrow";
        return <>
            <div className="centerContainer">
                <div className={`messageBox${(this.props.width === "none") ? "" : ` ${width}`}`} style={`z-index: ${this.props.zIndex};`}>
                    <div className="messageHeader">
                        {this.props.title}
                        {this.props.modal === true ? null : <Button className="messageClose" onClick={this.close} title="Esc">X</Button>}
                    </div>
                    <div ref={this.body} className="messageBody" onKeyDown={(this.props.behavior & MessageBoxBehavior.keyboardNavigationForButtons) ? (event) => {
                        const offset = Shared.keyToVerticalOffset[event.key];
                        if (offset) {
                            Shared.focusFromQuery(this.body.current, MessageBox.menuButtonSelector, offset, true);
                            event.preventDefault();
                        }
                    } : null}>
                        {this.props.body}
                    </div>
                </div>
                <div className="dimmer" onClick={this.close} style={`z-index: ${this.props.zIndex - MessageBox.dimmerZOffset};`}></div>
            </div>
        </>;
    }
}
