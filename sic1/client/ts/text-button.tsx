import React from "react";

export class TextButton extends React.Component<{ children?: React.ReactNode; onClick: () => void }> {
    constructor(props) {
        super(props);
    }

    public render() {
        return <a href="#" onClick={(event) => {
            event.preventDefault();
            this.props.onClick();
        }}>{this.props.children}</a>
    }
}
