import { Assembler, Emulator, CompilationError, Constants, Variable } from "../../lib-ts/src/sic1asm"
import { Puzzle, puzzles } from "./puzzles"
declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// TODO: User id and persistent state
// TODO: Message box escape key
// TODO: Puzzle load, including saving of previous puzzle
// TODO: Save puzzle progress
// TODO: Service integration
// TODO: Charts
// TODO: Puzzle list
// TODO: Welcome/intro
// TODO: User stats/resume
// TODO: Load last open puzzle

interface MessageBoxContent {
    title: string;
    modal?: boolean;
    body: React.ReactFragment;
}

interface MessageBoxManager {
    showMessageBox: (properties: MessageBoxContent) => void;
    closeMessageBox: () => void;
}

interface MessageBoxProperties extends MessageBoxContent {
    messageBoxManager: MessageBoxManager;
}

class MessageBox extends React.Component<MessageBoxProperties> {
    constructor(props) {
        super(props);
    }

    private close = () => {
        this.props.messageBoxManager.closeMessageBox();
    }

    public render() {
        return <>
            <div className="messageBox">
                <div className="messageHeader">
                    {this.props.title}
                    {this.props.modal ? null : <button className="messageClose" onClick={this.close}>X</button>}
                </div>
                <div className="messageBody">
                    {this.props.body}
                </div>
            </div>
            <div className="dimmer" onClick={this.props.modal ? null : this.close}></div>
        </>;
    }
}

// State management
enum StateFlags {
    none = 0x0,
    running = 0x1,
    error = 0x2,
    done = 0x4,
}

interface Sic1IdeProperties {
    puzzle: Puzzle;
    messageBoxManager: MessageBoxManager;
}

interface Sic1IdeTransientState {
    stateLabel: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    sourceLines: string[];

    actualOutputBytes: number[];

    currentSourceLine?: number;
    currentAddress?: number;
    unexpectedOutputIndexes: { [index: number]: boolean };
    variables: Variable[];

    // Memory
    [index: number]: number;
}

interface Sic1IdeState extends Sic1IdeTransientState {
    inputBytes: number[];
    expectedOutputBytes: number[];
}

class Sic1Ide extends React.Component<Sic1IdeProperties, Sic1IdeState> {
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
            ...Sic1Ide.createEmptyTransientState(),
            inputBytes,
            expectedOutputBytes,
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

    private static createEmptyTransientState(): Sic1IdeTransientState {
        let state: Sic1IdeTransientState = {
            stateLabel: "",
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,
            sourceLines: [],
            actualOutputBytes: [],
            unexpectedOutputIndexes: {},
            variables: [],
        };

        // Initialize memory
        for (let i = 0; i < 256; i++) {
            state[i] = 0;
        }

        return state;
    }

    private reset() {
        this.setState(Sic1Ide.createEmptyTransientState());
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
            const sourceLines = this.inputSource.current.value.split("\n");
            this.setState({ sourceLines });

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
                            const index = outputIndex;
                            this.setState(state => {
                                const unexpectedOutputIndexes = {};
                                for (let key in state.unexpectedOutputIndexes) {
                                    unexpectedOutputIndexes[key] = state.unexpectedOutputIndexes[key];
                                }
                                unexpectedOutputIndexes[index] = true;
                                return { unexpectedOutputIndexes };
                            });
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
                        currentSourceLine: (data.ip <= Constants.addressUserMax) ? data.sourceLineNumber : undefined,
                        currentAddress: data.ip,
                        variables: data.variables,
                    });

                    if (done) {
                        this.setStateFlag(StateFlags.done);
                    }
                },
            });
        } catch (error) {
            if (error instanceof CompilationError) {
                this.props.messageBoxManager.showMessageBox({
                    title: "Compilation Error",
                    body: <>
                        <h2>Compilation Error!</h2>
                        <p>{error.message}</p>
                    </>,
                })
            } else {
                throw error;
            }
        }
    }

    private stop = () => {
        this.autoStep = false;
        this.reset();
        this.setStateFlags(StateFlags.none);
    }

    private stepInternal() {
        if (this.emulator) {
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
        this.reset();
    }

    public componentWillUnmount() {
        this.clearInterval();
    }

    public render() {
        return <div className="ide">
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
                                    <td className={this.state.unexpectedOutputIndexes[index] ? "attention" : ""}>{(index < this.state.expectedOutputBytes.length) ? this.state.expectedOutputBytes[index] : null}</td>
                                    <td className={this.state.unexpectedOutputIndexes[index] ? "attention" : ""}>{(index < this.state.actualOutputBytes.length) ? this.state.actualOutputBytes[index] : null}</td>
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
                        this.state.sourceLines.map((line, index) => {
                            if (/\S/.test(line)) {
                                return <div className={(index === this.state.currentSourceLine) ? "emphasize" : ""}>{line}</div>;
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
                    this.memoryMap.map(row => <tr>{row.map(index => <td className={(index >= this.state.currentAddress && index < this.state.currentAddress + Constants.subleqInstructionBytes) ? "emphasize" : ""}>{Sic1Ide.hexifyByte(this.state[index])}</td>)}</tr>)
                }
                </table>
                <br />
                <table className={this.state.variables.length > 0 ? "" : "hidden"}>
                    <thead><tr><th>Label</th><th>Value</th></tr></thead>
                    <tbody>
                        {
                            this.state.variables.map(v => <tr>
                                <td className="text">{v.label}</td>
                                <td>{v.value}</td>
                            </tr>)
                        }
                    </tbody>
                </table>
            </div>
        </div>;
    }
}

// TODO: Refactor into root
class MessageBoxer implements MessageBoxManager {
    public showMessageBox(content: MessageBoxContent) {
        ReactDOM.render(<MessageBox title={content.title} modal={content.modal} body={content.body} messageBoxManager={this} />, document.getElementById("messageBoxRoot"));
    }

    public closeMessageBox() {
        ReactDOM.unmountComponentAtNode(document.getElementById("messageBoxRoot"));
    }
}

ReactDOM.render(<Sic1Ide puzzle={puzzles[0].list[1]} messageBoxManager={new MessageBoxer()} />, document.getElementById("root"));
