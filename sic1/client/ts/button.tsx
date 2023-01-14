import { Component, ComponentChild, createRef, JSX } from "preact";
import { SoundEffects } from "./sound-effects";

type ButtonProps = JSX.HTMLAttributes & {
    focusOnMount?: boolean;
};

export class Button extends Component<ButtonProps> {
    private button = createRef<HTMLButtonElement>();

    public componentDidMount(): void {
        if (this.props.focusOnMount) {
            this.button.current?.focus?.();
        }
    }

    public render(): ComponentChild {
        const { children, onClick, ...rest } = this.props;
        return <button
            {...rest}
            ref={this.button}
            onClick={event => {
                SoundEffects.play("click");
                onClick.call(event.target, event);
            }}
            >{children}</button>;
    }
}
