import { Component, ComponentChildren } from "preact";
import { ButtonWithResult } from "./button-result";

export class CopyToClipboardButton extends Component<{ text: string }> {
    public render(): ComponentChildren {
        return <ButtonWithResult
            onClickAsync={() => navigator?.clipboard?.writeText?.(this.props.text)}
            successMessage="Copied to the clipboard!"
            errorMessage="Error: Failed to copy to the clipboard."
            >Copy to Clipboard</ButtonWithResult>;
    }
}
