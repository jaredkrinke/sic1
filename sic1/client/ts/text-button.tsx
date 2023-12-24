import React from "react";

export class TextButton extends React.Component<{ text: string, onClick: () => void }> {
    constructor(props) {
        super(props);
    }

    public render() {
        return <a href="#" onClick={(event) => {
            event.preventDefault();
            this.props.onClick();
        }}>{this.props.text}</a>
    }
}
