import { Component, ComponentChildren } from "preact";
import { Button } from "./button";

export interface MessageBoxContent {
    title: string;
    menu?: boolean;
    modal?: boolean;
    width?: "none" | "wide" | "narrowByDefault";
    body: ComponentChildren;
}

interface MessageBoxProperties extends MessageBoxContent {
    previousFocus: Element;
    onDismissed: () => void;
}

export class MessageBox extends Component<MessageBoxProperties> {
    private static readonly menuButtonSelector = ".messageBody button";
    private static readonly keyToOffset = {
        ArrowUp: -1,
        ArrowDown: 1,
    };

    constructor(props: MessageBoxProperties) {
        super(props);
    }

    private close = () => {
        if (this.props.modal !== true) {
            this.props.onDismissed();
        }
    }

    private focusButton(offset: number): void {
        const elements = document.querySelectorAll<HTMLButtonElement>(MessageBox.menuButtonSelector);
        const activeElement = document.activeElement;
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element === activeElement) {
                let index = i + offset;
                if (index < 0) {
                    index = elements.length - 1;
                } else if (index >= elements.length) {
                    index = 0;
                }
                
                elements[index].focus();
                break;
            }
        }
    }

    public componentDidMount(): void {
        if (this.props.menu) {
            document.querySelector<HTMLButtonElement>(MessageBox.menuButtonSelector)?.focus?.();
        }
    }

    public componentWillUnmount(): void {
        const { previousFocus } = this.props;
        if (previousFocus && (document.activeElement !== previousFocus) && document.body.contains(previousFocus) && previousFocus["focus"]) {
            previousFocus["focus"]();
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
                        const offset = MessageBox.keyToOffset[event.key];
                        if (offset) {
                            this.focusButton(offset);
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
