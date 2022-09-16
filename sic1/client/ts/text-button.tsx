import { Component } from "preact";

export class TextButton extends Component<{ text: string, onClick: () => void }> {
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
