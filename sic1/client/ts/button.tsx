import { Component, ComponentChild, JSX } from "preact";
import { SoundEffects } from "./sound-effects";

type ButtonProps = JSX.HTMLAttributes;

export class Button extends Component<ButtonProps> {
    public render(): ComponentChild {
        // TODO: Support hitting enter!
        const { children, onClick, ...rest } = this.props;
        return <button
            {...rest}
            onClick={event => {
                SoundEffects.play("click");
                onClick.call(event.target, event);
            }}
            >{children}</button>;
    }
}
