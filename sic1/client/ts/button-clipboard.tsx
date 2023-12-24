import React from "react";
import { ButtonWithResult } from "./button-result";

export class CopyToClipboardButton extends React.Component<{ text: string }> {
    public render(): React.ReactNode {
        return <ButtonWithResult
            onClickAsync={() => navigator?.clipboard?.writeText?.(this.props.text)}
            successMessage="Copied to the clipboard!"
            errorMessage="Error: Failed to copy to the clipboard."
            >Copy to Clipboard</ButtonWithResult>;
    }
}
