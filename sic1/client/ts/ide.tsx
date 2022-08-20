import { Assembler, Emulator, CompilationError, Constants, Variable } from "sic1asm";
import { Shared } from "./shared";
import { Puzzle, Format, PuzzleTest, generatePuzzleTest } from "sic1-shared";
import { Component, ComponentChild, ComponentChildren, JSX, createRef } from "preact";

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
    onHalt: () => void;
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

export class Sic1Ide extends Component<Sic1IdeProperties, Sic1IdeState> {
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

    private inputCode = createRef<HTMLTextAreaElement>();
    private currentSourceLineElement = createRef<HTMLDivElement>();

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
            stateLabel: "Stopped",
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

    private static isElementInViewport(element: Element): boolean {
        var rect = element.getBoundingClientRect();

        return (
            rect.top >= 0
            && rect.left >= 0
            && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
            && rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
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

                onHalt: () => {
                    this.stop();
                    this.props.onHalt();
                }
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
            this.runToken = window.setInterval(this.runCallback, Sic1Ide.autoStepIntervalMS);
        }
    }

    private menu = () => {
        this.autoStep = false;
        this.props.onMenuRequested();
    }

    private keyDownHandler = (event: KeyboardEvent): void => {
        if (event.ctrlKey) {
            if (event.shiftKey) {
                if (event.key === "Enter") {
                    this.stop();
                }
            } else {
                if (event.key === "Enter") {
                    if (this.isExecuting()) {
                        this.pause();
                    } else {
                        this.run();
                    }
                } else if (event.key === ".") {
                    this.step();
                }
            }
        }

        if (event.key === "F1") {
            this.menu();
            event.preventDefault();
        }
    }

    private hasError(): boolean {
        return !!(this.stateFlags & StateFlags.error);
    }

    private formatCharacter(byte: number): string {
        if (byte === 39 /* apostrophe */ || byte === 92 /* backslash */) {
            return `'\\${String.fromCharCode(byte)}'`
        } else if (byte >= 32 && byte <= 126) {
            return `'${String.fromCharCode(byte)}'`
        } else {
            return "\u25A1";
        }
    }

    private formatByte(byte: number, format?: Format): string | number {
        switch (format) {
            case Format.characters:
                return this.formatCharacter(byte);

            default:
                return byte;
        }
    }

    private formatStringCharacter(byte: number): string {
        if ((byte >= 32 && byte <= 126) || byte === 10) {
            const character = String.fromCharCode(byte);
            if (character === '"' || character === "\\") {
                return "\\" + character;
            }
            return character;
        } else {
            return "\u25A1";
        }
    }

    private formatAndMarkString(numbers: number[], markIndex?: number, showTerminators?: boolean): (ComponentChildren)[] {
        let parts: string[];
        if (markIndex !== undefined) {
            // Split string (and insert "\n" to indicate a newline, if that's the current character)
            parts = [
                numbers.slice(0, markIndex).reduce((acc, value) => acc + this.formatStringCharacter(value), ""),
                (markIndex < numbers.length)
                    ? ((numbers[markIndex] === 10)
                        ? "\\n\n"
                        : this.formatStringCharacter(numbers[markIndex]))
                    : ((markIndex === numbers.length && showTerminators === true)
                        ? "\\0"
                        : ""),
                numbers.slice(markIndex + 1).reduce((acc, value) => acc + this.formatStringCharacter(value), ""),
            ];
        } else {
            parts = [numbers.reduce((acc, value) => acc + this.formatStringCharacter(value), "")];
        }

        // Convert newline characters to br elements
        return parts.map(part => {
            const lines = part.split("\n");
            // TODO: Type?
            const result: ComponentChild[] = [lines[0]];
            for (let i = 1; i < lines.length; i++) {
                result.push(<br />, lines[i]);
            }
            return result;
        });
    }

    private splitStrings(numbers: number[]): number[][] {
        const split: number[][] = [];
        let startIndex = 0;
        let zeroIndex: number;
        while ((zeroIndex = numbers.indexOf(0, startIndex)) >= 0) {
            split.push(numbers.slice(startIndex, zeroIndex));
            startIndex = zeroIndex + 1;
        }
        if (numbers[numbers.length - 1] !== 0) {
            split.push(numbers.slice(startIndex));
        }
        return split;
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

    public componentDidUpdate() {
        const element = this.currentSourceLineElement.current
        if (element && !Sic1Ide.isElementInViewport(element)) {
            element.scrollIntoView({ block: "nearest" });
        }
    }

    public render() {
        const inputBytes = this.state.test.testSets[this.testSetIndex].input;
        const expectedOutputBytes = this.state.test.testSets[this.testSetIndex].output;

        const renderStrings = (splitStrings: number[][], rows: number, showTerminators: boolean, currentIndex: number | null, unexpectedOutputIndexes?: {[index: number]: boolean}) => {
            let elements: JSX.Element[] = [];
            let renderIndex = 0;
            for (let i = 0; i < rows; i++) {
                const numbers = (i < splitStrings.length) ? splitStrings[i] : null;
                let body: ComponentChildren;
                let highlightRow: boolean;

                let errorInRow = false;
                if (numbers) {
                    // Check for error
                    if (unexpectedOutputIndexes) {
                        // Note: <= length to include zero terminator
                        for (let j = 0; j <= numbers.length; j++) {
                            if (unexpectedOutputIndexes[renderIndex++]) {
                                errorInRow = true;
                            }
                        }
                    }

                    // Highlight current index
                    highlightRow = (currentIndex !== null && currentIndex >= 0 && currentIndex <= numbers.length);
                    if (highlightRow) {
                        const parts = this.formatAndMarkString(numbers, currentIndex, showTerminators);
                        body = <>"{parts[0]}<span className="mark">{parts[1]}</span>{parts[2]}"</>
                    } else {
                        body = <>"{this.formatAndMarkString(numbers)[0]}"</>
                    }
                } else {
                    highlightRow = (currentIndex === 0);
                    body = <>&nbsp;</>
                    currentIndex = null;
                }

                elements.push(<td className={"text " + (errorInRow ? "attention" : (highlightRow ? "emphasize" : ""))}>
                    {body}
                </td>);

                if (currentIndex !== null && numbers) {
                    currentIndex -= (numbers.length + 1);
                }
            }
            return elements;
        };

        // IO table data
        let inputFragments: JSX.Element[];
        if (this.props.puzzle.inputFormat === Format.strings) {
            const splitStrings = this.splitStrings(inputBytes);
            inputFragments = renderStrings(splitStrings, splitStrings.length, true, this.state.currentInputIndex);
        } else {
            const baseClassName = (this.props.puzzle.inputFormat === Format.characters) ? "center " : "";
            inputFragments = inputBytes.map((x, index) =>
                <td className={baseClassName + (this.state.currentInputIndex === index ? "emphasize" : "")}>
                    {(index < inputBytes.length)
                    ? this.formatByte(inputBytes[index], this.props.puzzle.inputFormat)
                    : null}
                </td>);
        }

        let expectedFragments: ComponentChild[];
        let actualFragments: ComponentChild[];
        if (this.props.puzzle.outputFormat === Format.strings) {
            const splitStrings = this.splitStrings(expectedOutputBytes);
            expectedFragments = renderStrings(splitStrings, splitStrings.length, true, this.state.currentOutputIndex, this.state.unexpectedOutputIndexes);
            actualFragments = renderStrings(this.splitStrings(this.state.actualOutputBytes), splitStrings.length, false, this.state.currentOutputIndex, this.state.unexpectedOutputIndexes);
        } else {
            const baseClassName = (this.props.puzzle.outputFormat === Format.characters) ? "center " : "";
            expectedFragments = expectedOutputBytes.map((x, index) =>
                <td className={baseClassName + (this.state.unexpectedOutputIndexes[index] ? "attention" : (this.state.currentOutputIndex === index ? "emphasize" : ""))}>
                    {(index < expectedOutputBytes.length)
                    ? this.formatByte(expectedOutputBytes[index], this.props.puzzle.outputFormat)
                    : null}
                </td>
            );

            actualFragments = expectedOutputBytes.map((x, index) =>
                <td className={baseClassName + (this.state.unexpectedOutputIndexes[index] ? "attention" : (this.state.currentOutputIndex === index ? "emphasize" : ""))}>
                    {(index < this.state.actualOutputBytes.length)
                    ? this.formatByte(this.state.actualOutputBytes[index], this.props.puzzle.outputFormat)
                    : <>&nbsp;</>}
                </td>
            );
        }

        // IO table
        let columns: number;
        let ioFragment: ComponentChildren;
        if (this.props.puzzle.inputFormat === Format.strings && this.props.puzzle.outputFormat !== Format.strings) {
            // Two columns for expected/actual output, one column for input, input stacked above output
            columns = 2;
            for (const inputFragment of inputFragments) {
                inputFragment.props["colSpan"] = columns;
            }

            ioFragment = <>
                <tbody>
                    <tr><th colSpan={2}>In</th></tr>
                    {inputFragments.map(fragment => <tr>{fragment}</tr>)}
                    <tr><th>Expected</th><th>Actual</th></tr>
                    {
                        expectedOutputBytes.map((x, index) => <tr>
                            {(index < expectedFragments.length) ? expectedFragments[index] : <td></td>}
                            {(index < actualFragments.length) ? actualFragments[index] : <td></td>}
                        </tr>)
                    }
                </tbody>
            </>;
        } else if (this.props.puzzle.inputFormat === Format.strings || this.props.puzzle.outputFormat === Format.strings) {
            // Single column to accommodate strings
            columns = 1;
            ioFragment = <>
                <tbody>
                    <tr><th>In</th></tr>
                    {inputFragments.map(fragment => <tr>{fragment}</tr>)}
                    <tr><th>Expected</th></tr>
                    {expectedFragments.map(fragment => <tr>{fragment}</tr>)}
                    <tr><th>Actual</th></tr>
                    {actualFragments.map(fragment => <tr>{fragment}</tr>)}
                </tbody>
            </>;
        } else {
            // Three columns
            columns = 3;
            ioFragment = <>
                <thead><tr><th>In</th><th>Expected</th><th>Actual</th></tr></thead>
                <tbody>
                {
                    this.getLongestIOTable().map((x, index) => <tr>
                        {(index < inputFragments.length) ? inputFragments[index] : <td></td>}
                        {(index < expectedFragments.length) ? expectedFragments[index] : <td></td>}
                        {(index < actualFragments.length) ? actualFragments[index] : <td></td>}
                    </tr>)
                }
                </tbody>
            </>;
        }

        return <div className="ide">
            <div className="controls">
                <table>
                    <tr><th>{this.props.puzzle.title}</th></tr>
                    <tr><td className="text">{this.props.puzzle.description}</td></tr>
                </table>
                <br />
                <div className="ioBox">
                    <table>
                        <thead><tr><th colSpan={columns}>Test {this.testSetIndex + 1}</th></tr></thead>
                        {ioFragment}
                    </table>
                </div>
                <br />
                <table>
                    <tr><th className="horizontal">State</th><td>{this.state.stateLabel}</td></tr>
                    <tr><th className="horizontal">Cycles</th><td>{this.state.cyclesExecuted}</td></tr>
                    <tr><th className="horizontal">Bytes</th><td>{this.state.memoryBytesAccessed}</td></tr>
                </table>
                <br />
                <button onClick={this.stop} disabled={!this.hasStarted()} title="Esc or Ctrl+Shift+Enter">Stop</button>
                <button onClick={this.step} disabled={this.isDone()} title="Ctrl+.">Step</button>
                <button onClick={this.run} disabled={this.isDone()} title="Ctrl+Enter">Run</button>
                <button onClick={this.menu} title="Esc or F1">Menu</button>
                <div className="controlFooter"></div>
            </div>
            <div className="program">
                <textarea
                    ref={this.inputCode}
                    key={this.props.puzzle.title}
                    className={"input" + (this.hasStarted() ? " hidden" : "")}
                    spellcheck={false}
                    wrap="off"
                    defaultValue={this.props.defaultCode}
                    onBlur={(e) => {
                        // Work around onBlur apparently being called on unmount...
                        if (this.inputCode.current) {
                            this.props.onSaveRequested();
                        }
                    }}
                    ></textarea>
                <div className={"source" + (this.hasStarted() ? "" : " hidden")}>
                    {
                        this.state.sourceLines.map((line, index) => {
                            if (/\S/.test(line)) {
                                const currentLine = (index === this.state.currentSourceLine);
                                return currentLine
                                    ? <div ref={this.currentSourceLineElement} className="emphasize">{line}</div>
                                    : <div>{line}</div>;
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
