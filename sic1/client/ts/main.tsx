import { debug } from "./setup";
import { Sic1Root } from "./root";
import { BootScreen } from "./boot-screen";
import { Timer } from "./timer";
import { Component, ComponentChild, render } from "preact";
import { Platform } from "./platform";

type State = "booting" | "loading" | "loaded";

class Fader extends Timer {
    public render(): ComponentChild {
        return <div class="fader" style={`animation-duration: ${this.props.timerInMS}ms;`}></div>;
    }
}

class Screen extends Component<{}, { state: State }> {
    constructor(props) {
        super(props);
        this.state = {  state: (debug ? "loaded" : "booting") };
    }

    private keyUpHandler = (event: KeyboardEvent) => {
        if (event.altKey && event.key === "Enter" || (Platform.app && (event.key === "F11" || event.key === "F4"))) {
            // Fullscreen hotkeys: Alt+Enter (on all platforms), and also F4/F11 for non-web versions
            Platform.fullscreen.set(!Platform.fullscreen.get());
        }
    }

    public componentDidMount() {
        window.addEventListener("keyup", this.keyUpHandler);
    }

    public componentWillUnmount() {
        window.removeEventListener("keyup", this.keyUpHandler);
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
