import React from "react";
import { SoundEffects } from "./sound-effects";

export type ButtonProps = React.JSX.HTMLAttributes & {
    focusOnMount?: boolean;
    enableDelayMS?: number;
};

export class Button extends React.Component<ButtonProps, { disabledOverride?: boolean }> {
    private button = React.createRef<HTMLButtonElement>();

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

    public render(): React.ReactNode {
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
