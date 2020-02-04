import { Assembler, Emulator, CompilationError, Constants, Variable } from "../../../lib/src/sic1asm";
import { Puzzle } from "./puzzle";
import { Shared, TestSet } from "./shared";
import { PuzzleTest, generatePuzzleTest } from "./puzzles";
declare const React: typeof import("react");

// State management
enum StateFlags {
    none = 0x0,
    running = 0x1,
    error = 0x2,
    done = 0x4,
}

interface Sic1IdeProperties {
    puzzle: Puzzle;
    defaultCode: string;

    onCompilationError: (error: CompilationError) => void;
    onMenuRequested: () => void;
    onPuzzleCompleted: (cyclesExecuted: number, memoryBytesAccessed: number, programBytes: number[]) => void;
    onSaveRequested: () => void;
}

interface Sic1IdeTransientState {
    stateLabel: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    sourceLines: string[];

    test: PuzzleTest;
    actualOutputBytes: number[];

    currentSourceLine?: number;
    currentAddress: number | null;
    currentInputIndex: number | null;
    currentOutputIndex: number | null;
    unexpectedOutputIndexes: { [index: number]: boolean };
    variables: Variable[];

    // Memory
    [index: number]: number;
}

interface Sic1IdeState extends Sic1IdeTransientState {
}

export class Sic1Ide extends React.Component<Sic1IdeProperties, Sic1IdeState> {
    private static autoStepIntervalMS = 40;

    private stateFlags = StateFlags.none;
    private autoStep = false;
    private runToken?: number;
    private memoryMap: number[][];
    private programBytes: number[];
    private emulator: Emulator;
    private testSetIndex: number;
    private solutionCyclesExecuted?: number;
    private solutionMemoryBytesAccessed?: number;

    private inputCode = React.createRef<HTMLTextAreaElement>();

    constructor(props: Sic1IdeProperties) {
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

        let state: Sic1IdeState = Sic1Ide.createEmptyTransientState(props.puzzle);
        this.state = state;
        this.testSetIndex = 0;
    }

    private static createEmptyTransientState(puzzle: Puzzle): Sic1IdeTransientState {
        let state: Sic1IdeTransientState = {
            stateLabel: "",
            currentAddress: null,
            currentInputIndex: null,
            currentOutputIndex: null,
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,
            sourceLines: [],
            test: generatePuzzleTest(puzzle),
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

    private getLongestIOTable(): number[] {
        const a = this.state.test.testSets[this.testSetIndex].input;
        const b = this.state.test.testSets[this.testSetIndex].output;
        return (a.length >= b.length) ? a : b;
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
            // Show message box
            this.props.onPuzzleCompleted(this.solutionCyclesExecuted, this.solutionMemoryBytesAccessed, this.programBytes);
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

    private load(): boolean {
        try {
            const sourceLines = this.inputCode.current.value.split("\n");
            this.setState({ sourceLines });

            this.emulator = null;
            this.setStateFlags(StateFlags.none);

            let inputSetIndex = 0;
            let inputIndex = 0;
            let outputIndex = 0;
            let done = false;
            let recordSolutionStats = false;
            const assembledProgram = Assembler.assemble(sourceLines);

            this.programBytes = assembledProgram.bytes.slice();
            this.emulator = new Emulator(assembledProgram, {
                readInput: () => {
                    // Get next input, or zero if past the end
                    const inputBytes = this.state.test.testSets[inputSetIndex].input;
                    var value = (inputIndex < inputBytes.length) ? inputBytes[inputIndex] : 0;
                    inputIndex++;

                    // Advance set, if needed
                    if (inputIndex >= this.state.test.testSets[inputSetIndex].input.length && (inputSetIndex + 1 < this.state.test.testSets.length)) {
                        inputIndex = 0;
                        inputSetIndex++;
                    }

                    return value;
                },

                writeOutput: (value) => {
                    const expectedOutputBytes = this.state.test.testSets[this.testSetIndex].output;
                    if (outputIndex < expectedOutputBytes.length) {
                        this.setState(state => ({ actualOutputBytes: [...state.actualOutputBytes, value] }));

                        if (value !== expectedOutputBytes[outputIndex]) {
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

                        if (++outputIndex == expectedOutputBytes.length && !this.hasError()) {
                            if (this.testSetIndex === 0) {
                                // Record stats from the fixed test
                                recordSolutionStats = true;
                            }

                            if (this.testSetIndex === this.state.test.testSets.length - 1) {
                                done = true;
                            } else {
                                this.testSetIndex++;
                                outputIndex = 0;
                                this.setState({ actualOutputBytes: [] });
                            }
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
                        currentInputIndex: inputSetIndex === this.testSetIndex ? ((inputIndex < this.state.test.testSets[inputSetIndex].input.length) ? inputIndex : null) : null,
                        currentOutputIndex: (outputIndex < this.state.test.testSets[this.testSetIndex].output.length) ? outputIndex : null,
                        variables: data.variables,
                    });

                    if (recordSolutionStats) {
                        recordSolutionStats = false;
                        this.solutionCyclesExecuted = this.emulator.getCyclesExecuted();
                        this.solutionMemoryBytesAccessed = this.emulator.getMemoryBytesAccessed();
                    }

                    if (done) {
                        this.setStateFlag(StateFlags.done);
                    }
                },
            });

            return true;
        } catch (error) {
            if (error instanceof CompilationError) {
                this.props.onCompilationError(error);
            } else {
                throw error;
            }
        }
        return false;
    }

    private stepInternal() {
        if (this.emulator && !this.isDone()) {
            this.emulator.step();
        }
    }

    private step = () => {
        this.autoStep = false;
        if (this.hasStarted()) {
            this.stepInternal();
        } else {
            this.load();
        }
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
        let loaded = this.hasStarted() ? true : this.load();
        if (loaded && !this.isDone()) {
            this.autoStep = true;
            this.runToken = setInterval(this.runCallback, Sic1Ide.autoStepIntervalMS);
        }
    }

    private menu = () => {
        this.autoStep = false;
        this.props.onMenuRequested();
    }

    private keyDownHandler = (event: KeyboardEvent): void => {
        if ((event.ctrlKey || event.metaKey)) {
            if (event.keyCode === 13 || event.keyCode === 10) {
                // Ctrl+enter
                if (this.isExecuting()) {
                    this.pause();
                } else {
                    this.run();
                }
            } else if (event.keyCode === 190) {
                // Ctrl+.
                this.step();
            }
        }
    }

    private hasError(): boolean {
        return !!(this.stateFlags & StateFlags.error);
    }

    public hasStarted(): boolean {
        return !!(this.stateFlags & StateFlags.running);
    }

    public isDone(): boolean {
        return !!(this.stateFlags & StateFlags.done);
    }

    public isExecuting(): boolean {
        return this.autoStep;
    }

    public reset(puzzle: Puzzle) {
        this.setState(Sic1Ide.createEmptyTransientState(puzzle));
        this.setStateFlags(StateFlags.none);
        this.testSetIndex = 0;
        this.solutionCyclesExecuted = undefined;
        this.solutionMemoryBytesAccessed = undefined;

        if (this.inputCode.current) {
            this.inputCode.current.focus();
        }
    }

    public getCode(): string {
        return this.inputCode.current.value;
    }

    public pause = () => {
        this.autoStep = false;
    }

    public stop = () => {
        this.autoStep = false;
        this.reset(this.props.puzzle);
        this.setStateFlags(StateFlags.none);
    }

    public componentDidMount() {
        window.addEventListener("keydown", this.keyDownHandler);
    }

    public componentWillUnmount() {
        this.clearInterval();
        window.removeEventListener("keydown", this.keyDownHandler);
    }

    public render() {
        const inputBytes = this.state.test.testSets[this.testSetIndex].input;
        const expectedOutputBytes = this.state.test.testSets[this.testSetIndex].output;

        return <div className="ide">
            <div className="controls">
                <table>
                    <tr><th>{this.props.puzzle.title}</th></tr>
                    <tr><td className="text">{this.props.puzzle.description}</td></tr>
                </table>
                <br />
                <div className="ioBox">
                    <table>
                        <thead><tr><th colSpan={3}>Test {this.testSetIndex + 1}</th></tr></thead>
                        <thead><tr><th>In</th><th>Expected</th><th>Actual</th></tr></thead>
                        <tbody>
                            {
                                this.getLongestIOTable().map((x, index) => <tr>
                                    <td className={this.state.currentInputIndex === index ? "emphasize" : ""}>{(index < inputBytes.length) ? inputBytes[index] : null}</td>
                                    <td className={this.state.unexpectedOutputIndexes[index] ? "attention" : (this.state.currentOutputIndex === index ? "emphasize" : "")}>{(index < expectedOutputBytes.length) ? expectedOutputBytes[index] : null}</td>
                                    <td className={this.state.unexpectedOutputIndexes[index] ? "attention" : (this.state.currentOutputIndex === index ? "emphasize" : "")}>{(index < this.state.actualOutputBytes.length) ? this.state.actualOutputBytes[index] : null}</td>
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
                <button onClick={this.stop} disabled={!this.hasStarted()} title="Ctrl+Enter">Stop</button>
                <button onClick={this.step} disabled={this.isDone()} title="Ctrl+.">Step</button>
                <button onClick={this.run} disabled={this.isDone()} title="Ctrl+Enter">Run</button>
                <button onClick={this.menu} title="Esc">Menu</button>
            </div>
            <div className="program">
                <textarea
                    ref={this.inputCode}
                    key={this.props.puzzle.title}
                    className={"input" + (this.hasStarted() ? " hidden" : "")}
                    spellCheck={false}
                    wrap="off"
                    defaultValue={this.props.defaultCode}
                    onBlur={this.props.onSaveRequested}
                    ></textarea>
                <div className={"source" + (this.hasStarted() ? "" : " hidden")}>
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
                    this.memoryMap.map(row => <tr>{row.map(index => <td className={(this.state.currentAddress !== null && index >= this.state.currentAddress && index < this.state.currentAddress + Constants.subleqInstructionBytes) ? "emphasize" : ""}>{Shared.hexifyByte(this.state[index])}</td>)}</tr>)
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