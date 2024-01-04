import React from "react";
import { ButtonWithResult } from "./button-result";
import { FormattedMessage, IntlShape } from "react-intl";

export class CopyToClipboardButton extends React.Component<{ intl: IntlShape, text: string }> {
    public render(): React.ReactNode {
        return <ButtonWithResult
            onClickAsync={() => navigator?.clipboard?.writeText?.(this.props.text)}
            successMessage={this.props.intl.formatMessage({
                id: "textCopySucceeded",
                description: "Message printed after copying text to the clipboard succeeds (only used on the web version)",
                defaultMessage: "Copied to the clipboard!",
            })}
            errorMessage={this.props.intl.formatMessage({
                id: "textCopyFailed",
                description: "Message shown when copying text to the clipboard fails (only used on the web version)",
                defaultMessage: "Error: Failed to copy to the clipboard.",
            })}
            ><FormattedMessage
                id="buttonCopyToClipboard"
                description="Text shown on the 'copy text to clipboard' button (only used on the web version)"
                defaultMessage="Copy to Clipboard"
                />
            </ButtonWithResult>;
    }
}
