import { debug } from "./setup";
import { Sic1Root } from "./root";
import { BootScreen } from "./boot-screen";
import { Timer } from "./timer";
import { Component, ComponentChild, render } from "preact";

type State = "booting" | "loading" | "loaded";

class Fader extends Timer {
    public render(): ComponentChild {
        return <div class="fader" style={`animation-duration: ${this.props.timerInMS}ms;`}></div>;
    }
}

class Screen extends Component<{}, { state: State}> {
    constructor(props) {
        super(props);
        this.state = {  state: (debug ? "loaded" : "booting") };
    }

    render(): ComponentChild {
        const { state } = this.state;
        return <>
            {state === "booting" ? <BootScreen onCompleted={() => this.setState({ state: "loading" })} /> : null}
            {state === "loading" ? <Fader timerInMS={250} onTimerCompleted={() => this.setState({ state: "loaded" })} /> : null}
            {(state === "loading" || state === "loaded") ? <Sic1Root /> : null}
        </>;
    }
}

render(<Screen />, document.getElementById("root"));
