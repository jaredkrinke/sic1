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
// TODO: Run/auto-step
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
    stateFlags: StateFlags;
    stateLabel: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    sourceLines: string[];

    // Memory
    [index: number]: number;
}

class Sic1Ide extends React.Component<{ puzzle: Puzzle }, Sic1IdeState> {
    private autoStep = false;
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


        let state: Sic1IdeState = {
            stateFlags: StateFlags.none,
            stateLabel: "",
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,
            sourceLines: [],
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

    private isRunning(): boolean {
        return !!(this.state.stateFlags & StateFlags.running);
    }

    private setStateFlags(update: (oldStateFlags: StateFlags) => StateFlags): void {
        let newStateFlags: StateFlags;
        this.setState(state => ({ stateFlags: (newStateFlags = update(state.stateFlags)) }));

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

    private setStateFlag(flag: StateFlags, on: boolean): void {
        if (on === false) {
            this.setStateFlags(stateFlags => (stateFlags & ~flag));
        } else {
            this.setStateFlags(stateFlags => (stateFlags | flag));
        }
    }

    private updateMemory(address: number, value: number): void {
        this.setState({ [address]: value });
    }

    private load = () => {
        try {
            const sourceLines = this.inputSource.current.value.split("\n");
            this.setState({ sourceLines });
            // TODO: Highlighting

            this.setStateFlags(old => StateFlags.none);

            let inputIndex = 0;
            let outputIndex = 0;
            let done = false;
            const assembledProgram = Assembler.assemble(sourceLines);

            this.programBytes = assembledProgram.bytes.slice();
            this.emulator = new Emulator(assembledProgram, {
                readInput: () => {
                    // TODO: Read next input
                    return 0;
                },

                writeOutput: (value) => {
                    // TODO: Record and test output
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
                        this.setStateFlag(StateFlags.done, true);
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
        this.setStateFlags(old => StateFlags.none);
    }

    private step = () => {
        if (this.emulator) {
            // TODO: Update highlights
            this.emulator.step();
        }
    }

    private run = () => {
        // TODO
    }

    public render() {
        // TODO: Move this logic to an update and put io in props?
        let inputBytes = [].concat(...this.props.puzzle.io.map(row => row[0]));
        let expectedOutputBytes = [].concat(...this.props.puzzle.io.map(row => row[1]));

        const rowCount = Math.max(inputBytes.length, expectedOutputBytes.length);
        const table: (number | null)[][] = [];
        for (let i = 0; i < rowCount; i++) {
            table.push([
                (i < inputBytes.length) ? inputBytes[i] : null,
                (i < expectedOutputBytes.length) ? expectedOutputBytes[i] : null,
                null
            ]);
        }

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
                        <tbody>{
                            table.map(row => <tr>{row.map(col => <td>{col}</td>)}</tr>)
                        }</tbody>
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
                <button>Menu</button>
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

ReactDOM.render(<Sic1Ide puzzle={puzzles[0].list[0]} />, document.getElementById("root"));
