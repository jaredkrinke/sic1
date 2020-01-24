import { Assembler, Emulator, CompilationError } from "../../lib-ts/src/sic1asm"
import { Puzzle, puzzles } from "./puzzles"
declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// TODO: User id and persistent state
// TODO: Message box and dimmer
// TODO: Message box escape key
// TODO: Highlighting
// TODO: Puzzle load, including saving of previous puzzle
// TODO: Save puzzle progress
// TODO: Service integration
// TODO: Charts
// TODO: Puzzle list
// TODO: Welcome/intro
// TODO: User stats/resume
// TODO: Load last open puzzle

// State management
enum StateFlags {
    none = 0x0,
    running = 0x1,
    error = 0x2,
    done = 0x4,
}

interface Sic1IdeState {
    stateLabel: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    sourceLines: string[];

    inputBytes: number[];
    expectedOutputBytes: number[];
    actualOutputBytes: number[];

    // Memory
    [index: number]: number;
}

class Sic1Ide extends React.Component<{ puzzle: Puzzle }, Sic1IdeState> {
    private static autoStepIntervalMS = 40;

    private stateFlags = StateFlags.none;
    private autoStep = false;
    private runToken?: number;
    private memoryMap: number[][];
    private programBytes: number[];
    private emulator: Emulator;

    private inputSource = React.createRef<HTMLTextAreaElement>();

    constructor(props) {
        super(props);

        const memoryMap: number[][] = [];
        for (let i = 0; i < 16; i++) {
            let row: number[] = [];
            for (let j = 0; j < 16; j++) {
                row.push(16 * i + j);
            }
            memoryMap.push(row);
        }
        this.memoryMap = memoryMap;

        // TODO: Shuffle order
        const inputBytes = [].concat(...this.props.puzzle.io.map(row => row[0]));
        const expectedOutputBytes = [].concat(...this.props.puzzle.io.map(row => row[1]));

        let state: Sic1IdeState = {
            stateLabel: "",
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,
            sourceLines: [],

            inputBytes,
            expectedOutputBytes,
            actualOutputBytes: [],
        };

        // Initialize memory
        for (let i = 0; i < 256; i++) {
            state[i] = 0;
        }

        this.state = state;
    }

    private static hexifyByte(v: number): string {
        var str = v.toString(16);
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    }

    private initialize() {
        this.setStateFlags(StateFlags.none);
    }

    private getLongestIOTable(): number[] {
        const a = this.state.inputBytes;
        const b = this.state.expectedOutputBytes;
        return (a.length >= b.length) ? a : b;
    }

    private isRunning(): boolean {
        return !!(this.stateFlags & StateFlags.running);
    }

    private setStateFlags(newStateFlags: StateFlags): void {
        this.stateFlags = newStateFlags;

        const running = !!(newStateFlags & StateFlags.running);
        let success = false;
        let stateLabel = "Stopped";
        const error = !!(newStateFlags & StateFlags.error);
        if ((newStateFlags & StateFlags.done) && !error) {
            success = true;
            stateLabel = "Completed";
        } else if (running) {
            stateLabel = "Running"
        }

        this.setState({ stateLabel });

        if (success) {
            // TODO: Remove
            // TODO: Setup charts
            // TODO: Show "success" message box
            // TODO: Mark as solved in persistent state
        }

        this.autoStep = this.autoStep && (running && !success && !error);
    }

    private setStateFlag(flag: StateFlags, on: boolean = true): void {
        if (on === false) {
            this.setStateFlags(this.stateFlags & ~flag);
        } else {
            this.setStateFlags(this.stateFlags | flag);
        }
    }

    private updateMemory(address: number, value: number): void {
        this.setState({ [address]: value });
    }

    private load = () => {
        try {
            // TODO: Reset transient state
            const sourceLines = this.inputSource.current.value.split("\n");
            this.setState({ sourceLines });
            // TODO: Highlighting

            this.setStateFlags(StateFlags.none);

            let inputIndex = 0;
            let outputIndex = 0;
            let done = false;
            const assembledProgram = Assembler.assemble(sourceLines);

            this.programBytes = assembledProgram.bytes.slice();
            this.emulator = new Emulator(assembledProgram, {
                readInput: () => {
                    var value = (inputIndex < this.state.inputBytes.length) ? this.state.inputBytes[inputIndex] : 0;
                    inputIndex++;
                    return value;
                },

                writeOutput: (value) => {
                    if (outputIndex < this.state.expectedOutputBytes.length) {
                        this.setState(state => ({ actualOutputBytes: [...state.actualOutputBytes, value] }));

                        if (value !== this.state.expectedOutputBytes[outputIndex]) {
                            this.setStateFlag(StateFlags.error);
                            // TODO: Highlight
                        }

                        if (++outputIndex == this.state.expectedOutputBytes.length) {
                            done = true;
                        }
                    }
                },

                onWriteMemory: (address, value) => {
                    this.updateMemory(address, value);
                },

                onStateUpdated: (data) => {
                    this.setStateFlag(StateFlags.running, data.running);
                    this.setState({
                        cyclesExecuted: data.cyclesExecuted,
                        memoryBytesAccessed: data.memoryBytesAccessed,
                    });

                    // TODO: Highlight address

                    if (done) {
                        this.setStateFlag(StateFlags.done);
                    }

                    // TODO: Update variables
                },
            });
        } catch (error) {
            if (error instanceof CompilationError) {
                // TODO: Set error message in pop-up
            } else {
                throw error;
            }
        }
    }

    private stop = () => {
        this.autoStep = false;
        this.setStateFlags(StateFlags.none);
    }

    private stepInternal() {
        if (this.emulator) {
            // TODO: Update highlights
            this.emulator.step();
        }
    }

    private step = () => {
        this.autoStep = false;
        this.stepInternal();
    }

    private clearInterval() {
        if (this.runToken !== undefined) {
            clearInterval(this.runToken);
            this.runToken = undefined;
        }
    }

    private runCallback = () => {
        if (this.autoStep) {
            this.stepInternal();
        } else {
            this.clearInterval();
        }
    }

    private run = () => {
        this.autoStep = true;
        this.runToken = setInterval(this.runCallback, Sic1Ide.autoStepIntervalMS);
    }

    private menu = () => {
        this.autoStep = false;
        // TODO: Show puzzle list
    }

    public componentDidMount() {
        this.initialize();
    }

    public componentWillUnmount() {
        this.clearInterval();
    }

    public render() {
        return <>
            <div className="controls">
                <table>
                    <tr><th>{this.props.puzzle.title}}</th></tr>
                    <tr><td className="text">{this.props.puzzle.description}</td></tr>
                </table>
                <br />
                <div className="ioBox">
                    <table>
                        <thead><tr><th>In</th><th>Expected</th><th>Actual</th></tr></thead>
                        <tbody>
                            {
                                this.getLongestIOTable().map((x, index) => <tr>
                                    <td>{(index < this.state.inputBytes.length) ? this.state.inputBytes[index] : null}</td>
                                    <td>{(index < this.state.expectedOutputBytes.length) ? this.state.expectedOutputBytes[index] : null}</td>
                                    <td>{(index < this.state.actualOutputBytes.length) ? this.state.actualOutputBytes[index] : null}</td>
                                </tr>)
                            }
                        </tbody>
                    </table>
                </div>
                <br />
                <table>
                    <tr><th className="horizontal">State</th><td>{this.state.stateLabel}</td></tr>
                    <tr><th className="horizontal">Cycles</th><td>{this.state.cyclesExecuted}</td></tr>
                    <tr><th className="horizontal">Bytes</th><td>{this.state.memoryBytesAccessed}</td></tr>
                </table>
                <br />
                <button onClick={this.load} disabled={this.isRunning()}>Load</button>
                <button onClick={this.stop} disabled={!this.isRunning()}>Stop</button>
                <button onClick={this.step} disabled={!this.isRunning()}>Step</button>
                <button onClick={this.run} disabled={!this.isRunning()}>Run</button>
                <button onClick={this.menu}>Menu</button>
            </div>
            <div className="program">
                <textarea ref={this.inputSource} className={"input" + (this.isRunning() ? " hidden" : "")} spellCheck={false} wrap="off">{this.props.puzzle.code}</textarea>
                <div className={"source" + (this.isRunning() ? "" : " hidden")}>
                    {
                        this.state.sourceLines.map(line => {
                            if (/\S/.test(line)) {
                                return <div>{line}</div>;
                            } else {
                                return <br />
                            }
                        })
                    }
                </div>
            </div>
            <div>
                <table className="memory"><tr><th colSpan={16}>Memory</th></tr>
                {
                    this.memoryMap.map(row => <tr>{row.map(index => <td>{Sic1Ide.hexifyByte(this.state[index])}</td>)}</tr>)
                }
                </table>
                <br />
                <table className="hidden">
                    <thead><tr><th>Label</th><th>Value</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </>;
    }
}

ReactDOM.render(<Sic1Ide puzzle={puzzles[0].list[1]} />, document.getElementById("root"));
