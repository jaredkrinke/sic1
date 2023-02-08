import { Assembler, Emulator, CompilationError, Constants, Variable, Command } from "sic1asm";
import { Format, PuzzleTest, generatePuzzleTest, PuzzleTestSet } from "sic1-shared";
import { Component, ComponentChild, ComponentChildren, JSX, createRef } from "preact";
import { Button } from "./button";
import { ClientPuzzle, hasCustomInput } from "./puzzles";
import { MessageBoxContent } from "./message-box";
import { formatNameToFormat, formatToName, Sic1DataManager } from "./data-manager";
import { Sic1Memory } from "./ide-memory";
import { Sic1Watch } from "./ide-watch";
import { parseValues, Sic1InputEditor } from "./ide-input-editor";
import { Shared } from "./shared";
import { Sic1CodeView } from "./ide-code-view";

// State management
enum StateFlags {
    none = 0x0,
    running = 0x1,
    error = 0x2,
    done = 0x4,
}

function tryParseValues(text: string): number[] | undefined {
    try {
        return parseValues(text);
    } catch (e) {
        return undefined;
    }
}

interface Sic1IdeProperties {
    puzzle: ClientPuzzle;
    solutionName: string;
    defaultCode: string;

    onCompilationError: (error: CompilationError) => void;
    onHalt: () => void;
    onNoProgram: () => void;
    onMenuRequested: () => void;
    onPuzzleCompleted: (cyclesExecuted: number, memoryBytesAccessed: number, programBytes: number[]) => void;
    onSaveRequested: () => void;

    onShowMessageBox: (content: MessageBoxContent) => void;
    onCloseMessageBox: () => void;

    // For sound effects
    onOutputCorrect: () => void;
    onOutputIncorrect: () => void;
}

type PuzzleTestWithoutExpectedOutput = Omit<PuzzleTest, "testSets"> & { testSets: Omit<PuzzleTestSet, "output">[] };

interface Sic1IdeTransientState {
    stateLabel: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    sourceLines: string[];

    test: PuzzleTest | PuzzleTestWithoutExpectedOutput;
    actualOutputBytes: number[];
    inputFormat: Format;
    outputFormat: Format;

    currentSourceLine?: number;
    currentAddress: number | null;
    currentInputIndex: number | null;
    currentOutputIndex: number | null;
    unexpectedOutputIndexes: { [index: number]: boolean };
    variables: Variable[];
    variableToAddress: { [label: string]: number };
    watchedAddresses: Set<number>;
    sourceLineToBreakpointState: { [lineNumber: number]: boolean };

    // Memory
    [index: number]: number;
    highlightAddress?: number;

    // For achievement tracking
    hasReadInput: boolean;

    // Custom input
    customInputString?: string;
}

interface Sic1IdeEditorModeState {
    tabInsertMode: boolean;
    autoIndentMode: boolean;
}

interface Sic1IdeState extends Sic1IdeTransientState, Sic1IdeEditorModeState {
    executing: boolean;
}

export class Sic1Ide extends Component<Sic1IdeProperties, Sic1IdeState> {
    private static autoStepIntervalMS = 20;
    private static readonly stepRates = [
        { label: "Run", rate: 50 },
        { label: "Turbo (4x)", rate: 200 },
        { label: "Turbo (50x)", rate: 2500 },
    ];

    private codeView = createRef<Sic1CodeView>();

    private stateFlags = StateFlags.none;
    private stepRateIndex: number | undefined = undefined;
    private stepsPerInterval = 1;
    private resetRequired = false; // True if the current/last step incremented the testSetIndex, necessitating a post-step reset
    private runToken?: number;
    private memoryMap: number[][];
    private programBytes: number[];
    private emulator: Emulator;
    private testSetIndex: number;
    private solutionCyclesExecuted?: number;
    private solutionMemoryBytesAccessed?: number;

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

        const data = Sic1DataManager.getData();
        let state: Sic1IdeState = {
            executing: false,
            tabInsertMode: !!data.tabInsertMode,
            autoIndentMode: !!data.autoIndentMode,
            ...Sic1Ide.createEmptyTransientState(props.puzzle, props.solutionName),
        };

        this.state = state;
        this.testSetIndex = 0;
    }

    private static createEmptyTransientState(puzzle: ClientPuzzle, solutionName: string): Sic1IdeTransientState {
        const { solution } = Sic1DataManager.getPuzzleDataAndSolution(puzzle.title, solutionName, true);
        const { customInput: customInputString, customInputFormat, customOutputFormat } = solution;
        let state: Sic1IdeTransientState = {
            stateLabel: "Stopped",
            currentAddress: null,
            currentInputIndex: null,
            currentOutputIndex: null,
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,
            sourceLines: [],
            actualOutputBytes: [],
            unexpectedOutputIndexes: {},
            variables: [],
            variableToAddress: {},
            watchedAddresses: new Set(),
            sourceLineToBreakpointState: {},
            hasReadInput: false,

            // Load input from puzzle definition by default, but use saved input for sandbox mode
            customInputString,
            test: hasCustomInput(puzzle)
                ? { testSets: [{ input: tryParseValues(customInputString) ?? [] }] }
                : generatePuzzleTest(puzzle),
            
            inputFormat: customInputFormat ? formatNameToFormat[customInputFormat] : puzzle.inputFormat,
            outputFormat: customOutputFormat ? formatNameToFormat[customOutputFormat] : puzzle.outputFormat,
        };

        // Initialize memory
        for (let i = 0; i < 256; i++) {
            state[i] = 0;
        }

        return state;
    }

    private static rateToIntervalParameters(stepsPerSecond: number): { periodMS: number, stepsPerPeriod: number } {
        const minimumPeriodMS = 16;
        let periodMS = Math.round(1000 / stepsPerSecond);
        let stepsPerPeriod = 1;
        if (periodMS < minimumPeriodMS) {
            periodMS = minimumPeriodMS;
            stepsPerPeriod = Math.ceil(stepsPerSecond / (1000 / periodMS));
        }

        return {
            periodMS,
            stepsPerPeriod,
        };
    }

    private getLongestIOTable(): number[] {
        const a = this.state.test.testSets[this.testSetIndex].input;

        // Use expected output length, if available; otherwise, use actual output length
        const b = this.state.test.testSets[this.testSetIndex]["output"] ?? this.state.actualOutputBytes;

        return (a.length >= b.length) ? a : b;
    }

    private setStepRateIndex(index: number | undefined): void {
        if (index !== this.stepRateIndex) {
            if (this.runToken !== undefined) {
                window.clearInterval(this.runToken);
                this.runToken = undefined;
            }

            const executing = (index !== undefined);
            if (executing) {
                const { periodMS, stepsPerPeriod } = Sic1Ide.rateToIntervalParameters(Sic1Ide.stepRates[index].rate);
                this.stepsPerInterval = stepsPerPeriod;
                this.runToken = window.setInterval(this.runCallback, periodMS);
            }

            this.stepRateIndex = index;
            this.setState({ executing });
        }
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
        } else if (error) {
            this.props.onOutputIncorrect();
        }

        if (!running || success || error) {
            this.setStepRateIndex(undefined);
        }
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
            const sourceLines = this.codeView.current.getCode().split("\n");
            this.setState({ sourceLines });

            this.emulator = null;
            this.setStateFlags(StateFlags.none);

            let inputIndex = 0;
            let outputIndex = 0;
            let done = false;
            let readInput = false;
            const assembledProgram = Assembler.assemble(sourceLines);

            const sourceLineToBreakpointState = Object.fromEntries(assembledProgram.sourceMap
                .filter(sme => (sme && sme.command === Command.subleqInstruction))
                .map(sme => [sme.lineNumber, false]));

            this.setState({
                variableToAddress: Object.fromEntries(assembledProgram.variables.map(({label, address}) => [label, address])),
                sourceLineToBreakpointState,
            });

            this.programBytes = assembledProgram.bytes.slice();
            this.emulator = new Emulator(assembledProgram, {
                readInput: () => {
                    // Get next input, or zero if past the end
                    const inputBytes = this.state.test.testSets[this.testSetIndex].input;
                    var value = (inputIndex < inputBytes.length) ? inputBytes[inputIndex] : 0;
                    inputIndex++;
                    readInput = true;

                    return value;
                },

                writeOutput: (value) => {
                    const expectedOutputBytes = this.state.test.testSets[this.testSetIndex]["output"];
                    if (expectedOutputBytes) {
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
    
                            this.props.onOutputCorrect();
                            ++outputIndex;
                        }
                    } else {
                        this.setState(state => ({ actualOutputBytes: [...state.actualOutputBytes, value] }));
                    }
                },

                onWriteMemory: (address, value) => {
                    this.updateMemory(address, value);
                },

                onStateUpdated: (data) => {
                    // Check for program
                    if (this.emulator && this.emulator.isEmpty()) {
                        this.props.onNoProgram();
                        this.setStateFlag(StateFlags.error);
                    }

                    // Check for breakpoint
                    if (this.state.sourceLineToBreakpointState[data.sourceLineNumber]) {
                        this.setStepRateIndex(undefined);
                    }

                    // Check for completion, or a need to advance to the next test set
                    const expectedOutputBytes = this.state.test.testSets[this.testSetIndex]["output"];
                    if (expectedOutputBytes) {
                        if (this.emulator && this.emulator.isRunning() && outputIndex == expectedOutputBytes.length && !this.hasError()) {
                            if (this.testSetIndex === 0) {
                                // Record stats from the first test set
                                this.solutionCyclesExecuted = this.emulator.getCyclesExecuted();
                                this.solutionMemoryBytesAccessed = this.emulator.getMemoryBytesAccessed();
                            }
    
                            if (this.testSetIndex === this.state.test.testSets.length - 1) {
                                done = true;
                            } else {
                                this.testSetIndex++;
                                inputIndex = 0;
                                outputIndex = 0;
                                this.setState({ actualOutputBytes: [] });
                                this.resetRequired = true;
                            }
                        }
                    }

                    // Note: Halt is treated as "still running" so that memory, etc. can be inspected
                    this.setStateFlag(StateFlags.running, data.running || data.ip > Constants.addressInstructionMax);
                    this.setState(state => ({
                        cyclesExecuted: data.cyclesExecuted,
                        memoryBytesAccessed: data.memoryBytesAccessed,
                        currentSourceLine: (data.ip <= Constants.addressUserMax) ? data.sourceLineNumber : undefined,
                        currentAddress: data.ip,
                        currentInputIndex: (inputIndex < this.state.test.testSets[this.testSetIndex].input.length) ? inputIndex : null,
                        currentOutputIndex: (outputIndex < this.state.test.testSets[this.testSetIndex]["output"]?.length) ? outputIndex : null,
                        variables: data.variables,
                        hasReadInput: state.hasReadInput || readInput,
                    }));

                    if (done) {
                        this.setStateFlag(StateFlags.done);
                    }
                },
            });

            return true;
        } catch (error) {
            if (error instanceof CompilationError) {
                this.props.onCompilationError(error);
                if (error.context) {
                    this.codeView.current?.selectLine?.(error.context.sourceLineNumber, error.context.sourceLine);
                }
            } else {
                throw error;
            }
        }
        return false;
    }

    private stepInternal() {
        if (this.emulator && !this.isDone()) {
            this.emulator.step();
            if (!this.emulator.isRunning()) {
                // Execution halted
                this.setStepRateIndex(undefined);
                this.props.onHalt();
            } else if (this.resetRequired) {
                this.resetRequired = false;
                this.emulator.reset();
            }
        }
    }

    private step = () => {
        this.setStepRateIndex(undefined);
        if (this.hasStarted()) {
            this.stepInternal();
        } else {
            this.load();
        }
    }

    private runCallback = () => {
        for (let i = 0; (i < this.stepsPerInterval) && (this.stepRateIndex !== undefined); i++) {
            this.stepInternal();
        }
    }

    private run = () => {
        let loaded = this.hasStarted() ? true : this.load();
        if (loaded && !this.isDone()) {
            this.setStepRateIndex(0);
        }
    }

    private increaseSpeed = () => {
        if (this.stepRateIndex >= 0 && this.stepRateIndex < (Sic1Ide.stepRates.length - 1)) {
            this.setStepRateIndex(this.stepRateIndex + 1);
        }
    }

    private menu = () => {
        this.setStepRateIndex(undefined);
        this.props.onMenuRequested();
    }

    private keyDownHandler = (event: KeyboardEvent): void => {
        if (event.ctrlKey) {
            if (event.shiftKey) {
                if (event.key === "Enter") {
                    if (this.stepRateIndex !== undefined) {
                        this.pause();
                    } else {
                        this.stop();
                    }
                }
            } else {
                if (event.key === "Enter") {
                    if (this.stepRateIndex !== undefined) {
                        this.increaseSpeed();
                    } else if (!this.hasError()) {
                        this.run();
                    }
                } else if (event.key === ".") {
                    this.step();
                } else if (event.key === "z" || event.key === "y") {

                    // This is an annoying, but apparently necessary hack. While running, if the user hits Ctrl+Z, the
                    // (hidden) textarea's value is *not* modified, but the position in the undo/redo stack *is*
                    // changed. So if the user types Ctrl+Z or Ctrl+Y while running, and then again afterwards, the
                    // undo/redo history gets confused and corrupts the text in the textarea.
                    //
                    // Unfortunately, marking the textarea as hidden/disabled/readonly doesn't avoid this problem, so
                    // my hacky solution here is to just trap Ctrl+Z and Ctrl+Y when running.

                    if (this.hasStarted()) {
                        event.preventDefault();
                    }
                }
            }
        }

        if (event.key === "F1") {
            this.menu();
            event.preventDefault();
        }
    }

    private formatCharacter(byte: number): string {
        if (byte === 0 /* Null terminator */) {
            return "'\\0'";
        } else if (byte === 10 /* New line */) {
            return "'\\n'";
        } else if (byte === 39 /* apostrophe */ || byte === 92 /* backslash */) {
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

    private toggleEditorMode(mode: keyof Sic1IdeEditorModeState): void {
        this.setState((state) => ({ [mode]: !state[mode] } as Partial<Sic1IdeEditorModeState>));
    }

    private saveEditorMode(mode: keyof Sic1IdeEditorModeState): void {
        const data = Sic1DataManager.getData();
        data[mode] = this.state[mode];
        Sic1DataManager.saveData();
    }

    public getProgramBytes(): number[] | undefined {
        return this.programBytes;
    }

    public hasStarted(): boolean {
        return !!(this.stateFlags & StateFlags.running);
    }

    public isDone(): boolean {
        return !!(this.stateFlags & StateFlags.done);
    }

    public hasError(): boolean {
        return !!(this.stateFlags & StateFlags.error);
    }

    public hasReadInput(): boolean {
        return this.state.hasReadInput;
    }

    public pauseOrStop(): boolean {
        let handled = false;
        if (this.state.executing) {
            this.setStepRateIndex(undefined);
            handled = true;
        } else if (this.hasStarted()) {
            this.stop();
            handled = true;
        }
        return handled;
    }

    public reset(puzzle: ClientPuzzle, solutionName: string) {
        this.setState(Sic1Ide.createEmptyTransientState(puzzle, solutionName));
        this.setStateFlags(StateFlags.none);
        this.testSetIndex = 0;
        this.solutionCyclesExecuted = undefined;
        this.solutionMemoryBytesAccessed = undefined;

        if (this.codeView.current) {
            this.codeView.current.reset();
            this.codeView.current.focus();
        }
    }

    public getCode(): string {
        return this.codeView.current.getCode();
    }

    public pause = () => {
        this.setStepRateIndex(undefined);
    }

    public stop = () => {
        this.setStepRateIndex(undefined);
        this.reset(this.props.puzzle, this.props.solutionName);
        this.setStateFlags(StateFlags.none);
    }

    public componentDidMount() {
        window.addEventListener("keydown", this.keyDownHandler);
    }

    public componentWillUnmount() {
        this.setStepRateIndex(undefined);
        window.removeEventListener("keydown", this.keyDownHandler);
    }

    public componentDidUpdate(previousProps: Readonly<Sic1IdeProperties>, previousState: Readonly<Sic1IdeState>, snapshot: any): void {
        for (const mode of ["tabInsertMode", "autoIndentMode"] as const) {
            if (previousState[mode] !== this.state[mode]) {
                this.saveEditorMode(mode);
            }
        }
    }

    public render() {
        const inputBytes = this.state.test.testSets[this.testSetIndex].input;

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
        if (this.state.inputFormat === Format.strings) {
            const splitStrings = this.splitStrings(inputBytes);
            inputFragments = renderStrings(splitStrings, splitStrings.length, true, this.state.currentInputIndex);
        } else {
            const baseClassName = (this.state.inputFormat === Format.characters) ? "center " : "";
            inputFragments = inputBytes.map((x, index) =>
                <td className={baseClassName + (this.state.currentInputIndex === index ? "emphasize" : "")}>
                    {(index < inputBytes.length)
                    ? this.formatByte(inputBytes[index], this.state.inputFormat)
                    : null}
                </td>);
        }

        const expectedOutputBytes = this.state.test.testSets[this.testSetIndex]["output"];
        const hasExpectedOutput = !!expectedOutputBytes;
        let expectedFragments: ComponentChild[];
        let actualFragments: ComponentChild[];
        if (this.state.outputFormat === Format.strings) {
            let expectedSplitStrings: number[][];
            if (hasExpectedOutput) {
                expectedSplitStrings = this.splitStrings(expectedOutputBytes);
                expectedFragments = renderStrings(expectedSplitStrings, expectedSplitStrings.length, true, this.state.currentOutputIndex, this.state.unexpectedOutputIndexes);
            }

            actualFragments = renderStrings(
                this.splitStrings(this.state.actualOutputBytes),
                hasExpectedOutput
                    ? expectedSplitStrings.length
                    : this.state.actualOutputBytes.filter(x => (x === 0)).length + 1,
                false,
                this.state.currentOutputIndex,
                this.state.unexpectedOutputIndexes,
            );
        } else {
            const baseClassName = (this.state.outputFormat === Format.characters) ? "center " : "";
            if (hasExpectedOutput) {
                expectedFragments = expectedOutputBytes.map((x, index) =>
                    <td className={baseClassName + (this.state.unexpectedOutputIndexes[index] ? "attention" : (this.state.currentOutputIndex === index ? "emphasize" : ""))}>
                        {(index < expectedOutputBytes.length)
                        ? this.formatByte(expectedOutputBytes[index], this.state.outputFormat)
                        : null}
                    </td>
                );
                actualFragments = expectedOutputBytes.map((x, index) =>
                    <td className={baseClassName + (this.state.unexpectedOutputIndexes[index] ? "attention" : (this.state.currentOutputIndex === index ? "emphasize" : ""))}>
                        {(index < this.state.actualOutputBytes.length)
                        ? this.formatByte(this.state.actualOutputBytes[index], this.state.outputFormat)
                        : <>&nbsp;</>}
                    </td>
                );
            } else {
                actualFragments = this.state.actualOutputBytes.map((x, index) => <td>{
                    this.formatByte(this.state.actualOutputBytes[index], this.state.outputFormat)
                }</td>)
            }
        }

        // IO table
        let columns: number;
        let ioFragment: ComponentChildren;
        if (this.state.inputFormat === Format.strings && this.state.outputFormat !== Format.strings) {
            // Two columns (or 1 for sandbox) for expected/actual output, one column for input, input stacked above output
            columns = 2;
            for (const inputFragment of inputFragments) {
                inputFragment.props["colSpan"] = columns;
            }

            ioFragment = <>
                <tbody>
                    <tr><th colSpan={hasExpectedOutput ? 2 : 1}>In</th></tr>
                    {inputFragments.map(fragment => <tr>{fragment}</tr>)}
                    <tr>{hasExpectedOutput ? <th>Expected</th> : null}<th>Actual</th></tr>
                    {hasExpectedOutput
                        ? expectedOutputBytes.map((x, index) => <tr>
                                {(index < expectedFragments.length) ? expectedFragments[index] : <td></td>}
                                {(index < actualFragments.length) ? actualFragments[index] : <td></td>}
                            </tr>)
                        : actualFragments.map(td => <tr>{td}</tr>)
                    }
                </tbody>
            </>;
        } else if (this.state.inputFormat === Format.strings || this.state.outputFormat === Format.strings) {
            // Single column to accommodate strings
            columns = 1;
            ioFragment = <>
                <tbody>
                    <tr><th>In</th></tr>
                    {inputFragments.map(fragment => <tr>{fragment}</tr>)}
                    {hasExpectedOutput ? <>
                        <tr><th>Expected</th></tr>
                        {expectedFragments.map(fragment => <tr>{fragment}</tr>)}
                    </> : null}
                    <tr><th>Actual</th></tr>
                    {actualFragments.map(fragment => <tr>{fragment}</tr>)}
                </tbody>
            </>;
        } else {
            // Three (or two, for sandbox) columns
            columns = hasExpectedOutput ? 3 : 2;
            ioFragment = <>
                <thead><tr><th>In</th>{hasExpectedOutput ? <th>Expected</th> : null}<th>{hasExpectedOutput ? "Actual" : "Output"}</th></tr></thead>
                <tbody>
                {
                    this.getLongestIOTable().map((x, index) => <tr>
                        {(index < inputFragments.length) ? inputFragments[index] : <td></td>}
                        {hasExpectedOutput ? ((index < expectedFragments.length) ? expectedFragments[index] : <td></td>) : null}
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
                {hasCustomInput(this.props.puzzle) ? <>
                    <Button
                        className="normal"
                        disabled={this.hasStarted()}
                        onClick={() => this.props.onShowMessageBox({
                            title: "Configure Input",
                            width: "narrowByDefault",
                            body: <Sic1InputEditor
                                defaultInputString={this.state.customInputString}
                                defaultInputFormat={this.state.inputFormat}
                                defaultOutputFormat={this.state.outputFormat}
                                onApply={({ input, text: customInputString, inputFormat, outputFormat }) => {
                                    this.setState({
                                        customInputString,
                                        inputFormat,
                                        outputFormat,
                                        test: { testSets: [{ input }] },
                                    });

                                    // Save
                                    const { title } = this.props.puzzle;
                                    const { solutionName } = this.props;
                                    const { solution } = Sic1DataManager.getPuzzleDataAndSolution(title, solutionName, false);
                                    if (solution) {
                                        solution.customInput = customInputString;
                                        solution.customInputFormat = formatToName[inputFormat];
                                        solution.customOutputFormat = formatToName[outputFormat];
                                        Sic1DataManager.savePuzzleData(title);
                                    }
                                }}
                                onClose={() => this.props.onCloseMessageBox()}
                                />,
                        })}
                    >Configure Input</Button>
                    <br/>
                </> : null}
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
                <Button onClick={this.state.executing ? this.pause : this.stop} disabled={!this.hasStarted()} title="Esc or Ctrl+Shift+Enter">{this.state.executing ? "Pause" : "Stop"}</Button>
                <Button onClick={this.step} disabled={this.isDone()} title="Ctrl+.">{this.hasStarted() ? "Step" : "Compile"}</Button>
                <Button
                    onClick={this.state.executing ? this.increaseSpeed : this.run}
                    disabled={this.isDone() || this.hasError() || (this.stepRateIndex >= Sic1Ide.stepRates.length - 1)}
                    title="Ctrl+Enter"
                    >
                    {Sic1Ide.stepRates[Math.min(Sic1Ide.stepRates.length - 1, (this.stepRateIndex ?? -1) + 1)].label}
                </Button>
                <Button onClick={this.menu} title="Esc or F1">Menu</Button>
                <div className="controlFooter"></div>
            </div>
            <Sic1CodeView
                ref={this.codeView}
                key={`${this.props.puzzle.title}:${this.props.solutionName}`}

                puzzle={this.props.puzzle}
                solutionName={this.props.solutionName}
                defaultCode={this.props.defaultCode}

                tabInsertMode={this.state.tabInsertMode}
                autoIndentMode={this.state.autoIndentMode}

                hasStarted={this.hasStarted()}
                sourceLines={this.state.sourceLines}
                sourceLineToBreakpointState={this.state.sourceLineToBreakpointState}
                currentAddress={this.state.currentAddress}
                currentSourceLine={this.state.currentSourceLine}

                onSave={() => this.props.onSaveRequested()}
                onToggleBreakpoint={(lineNumber) => this.setState(state => ({ sourceLineToBreakpointState: { ...state.sourceLineToBreakpointState, [lineNumber]: !state.sourceLineToBreakpointState[lineNumber] } }))}
                onToggleTabInsertMode={() => this.toggleEditorMode("tabInsertMode")}
                />
            <div className="state">
                <Sic1Memory
                    hasStarted={this.hasStarted()}
                    currentAddress={this.state.currentAddress}
                    memoryMap={this.memoryMap}
                    memory={this.state}
                    watchedAddresses={this.state.watchedAddresses}
                    highlightAddress={this.state.highlightAddress}
                    onSetHighlightAddress={(highlightAddress) => this.setState({ highlightAddress })}
                    onToggleWatch={(address) => this.setState((state) => ({ watchedAddresses: Shared.toggleSetValue(state.watchedAddresses, address) }))}
                    />
                <br />
                {this.hasStarted()
                    ? <Sic1Watch
                        hasStarted={this.stateFlags !== StateFlags.none}
                        memory={this.state}
                        variables={this.state.variables}
                        variableToAddress={this.state.variableToAddress}
                        watchedAddresses={this.state.watchedAddresses}
                        highlightAddress={this.state.highlightAddress}
                        onSetHighlightAddress={(highlightAddress) => this.setState({ highlightAddress })}
                        />
                    : <>
                        <table>
                            <thead><tr><th>Editing Tools</th></tr></thead>
                            <tbody><tr><td>
                                <div className="controls">
                                    <br/>
                                    <Button onClick={() => this.codeView.current.blockComment()} title="Ctrl+K Ctrl+C">Comment Block</Button>
                                    <Button onClick={() => this.codeView.current.blockUncomment()} title="Ctrl+K Ctrl+U">Uncomment Block</Button>
                                    <br/>
                                    <Button onClick={() => this.codeView.current.indentLines()} title="Tab (in Tab Insert Mode only)">Indent Block</Button>
                                    <Button onClick={() => this.codeView.current.unindentLines()} title="Shift+Tab (in Tab Insert Mode only)">Unindent Block</Button>
                                    <br/>
                                    <Button onClick={() => this.toggleEditorMode("tabInsertMode")} title="Ctrl+M">{this.state.tabInsertMode ? "Disable" : "Enable"} Tab Insert Mode</Button>
                                    <Button onClick={() => this.toggleEditorMode("autoIndentMode")}>{this.state.autoIndentMode ? "Disable" : "Enable"} Auto-Indent Mode</Button>
                                    <br/>
                                </div>
                            </td></tr></tbody>
                        </table>
                    </>
                }
                
            </div>
        </div>;
    }
}
