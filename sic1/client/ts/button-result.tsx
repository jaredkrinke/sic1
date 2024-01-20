import React from "react";
import { Button, ButtonProps } from "./button";

interface ButtonWithResultProps extends ButtonProps {
    onClickAsync: () => Promise<void>;
    successMessage: string;
    errorMessage: string;
}

export class ButtonWithResult extends React.Component<ButtonWithResultProps, { result?: boolean }> {
    constructor(props) {
        super(props);
        
        this.state = {};
    }

    private start(): void {
        const promise = this.props.onClickAsync();
        if (promise) {
            promise
                .then(() => this.setState({ result: true }))
                .catch(() => this.setState({ result: false }))
            ;
        } else {
            this.setState({ result: false });
        }
    }

    public render(): React.ReactNode {
        const { children, successMessage, errorMessage, onClickAsync, ...rest } = this.props;
        return <>
            <p>{(this.state.result === undefined)
                ? <>&nbsp;</>
                : (this.state.result
                    ? successMessage
                    : errorMessage)
            }</p>
            <Button {...rest} onClick={() => this.start()}>{children}</Button>
        </>;
    }
}
