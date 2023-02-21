import { Component, ComponentChild, createRef, JSX } from "preact";
import { SoundEffects } from "./sound-effects";

export type ButtonProps = JSX.HTMLAttributes & {
    focusOnMount?: boolean;
    enableDelayMS?: number;
};

export class Button extends Component<ButtonProps, { disabledOverride?: boolean }> {
    private button = createRef<HTMLButtonElement>();

    constructor(props) {
        super(props);
        this.state = {
            disabledOverride: this.props.enableDelayMS ? true : undefined,
        };
    }

    public componentDidMount(): void {
        if (this.props.enableDelayMS) {
            setTimeout(() => {
                if (this?.button?.current) {
                    this.setState({ disabledOverride: false });
                }
            }, this.props.enableDelayMS);
        } else if (this.props.focusOnMount) {
            this.button.current?.focus?.();
        }
    }

    public render(): ComponentChild {
        const { children, onClick, ...rest } = this.props;
        return <button
            {...rest}
            ref={this.button}
            disabled={this.props.enableDelayMS ? this.state.disabledOverride : this.props.disabled}
            onKeyDown={(event) => {
                if (event.key === "Enter" && !event.ctrlKey) {
                    event.stopPropagation();
                }
            }}
            onClick={event => {
                SoundEffects.play("click");
                onClick.call(event.target, event);
            }}
            >{children}</button>;
    }
}
