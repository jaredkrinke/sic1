import { Component } from "preact";

interface TimerProperties {
    timerInMS: number;
    onTimerCompleted: () => void;
}

export class Timer<P = {}, S = {}> extends Component<P & TimerProperties, S> {
    private token?: number;

    constructor(props) {
        super(props);
    }

    public componentDidMount(): void {
        this.token = setTimeout(() => {
            this.token = undefined;
            this.props.onTimerCompleted();
        }, this.props.timerInMS);
    }

    public componentWillUnmount(): void {
        if (this.token !== undefined) {
            clearTimeout(this.token);
            this.token = undefined;
        }
    }

    public render() {
        return null;
    }
}
