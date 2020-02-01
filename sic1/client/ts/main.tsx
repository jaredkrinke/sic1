import { Assembler, Emulator, CompilationError, Constants, Variable } from "../../../lib/src/sic1asm"
import { Puzzle, puzzles } from "./puzzles"
import * as Contract from "sic1-server-contract"
import { MessageBox, MessageBoxContent } from "./message-box"
import { Chart, ChartData, HistogramBounds } from "./chart"
declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// TODO: Consider moving autoStep to state and having a "pause" button instead of "run"
// TODO: Consider getting rid of "load" and just having step/run load (and update the tutorial code)
// TODO: Have error messages show the offending line

function hexifyByte(v: number): string {
    var str = v.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

const identity = <T extends unknown>(x: T) => x;

// Persistent state management
interface UserData {
    userId?: string;
    name?: string;
    introCompleted: boolean;
    solvedCount: number;
    currentPuzzle?: string;
}

interface PuzzleData {
    unlocked: boolean;
    viewed: boolean;
    solved: boolean;
    solutionCycles?: number;
    solutionBytes?: number;
    code?: string;
}

interface DataManager {
    defaultName: string;
    getData: () => UserData;
    saveData: () => void;
    getPuzzleData: (title: string) => PuzzleData;
    savePuzzleData: (title: string) => void;
}

const Sic1DataManager: DataManager = class Sic1DataManager {
    private static readonly userIdLength = 15;
    private static readonly prefix = "sic1_";

    private static cache = {};

    public static readonly defaultName = "Bill";

    private static generateUserId() {
        const characters = "abcdefghijklmnopqrstuvwxyz";
        let id = "";
        for (var i = 0; i < Sic1DataManager.userIdLength; i++) {
            id += characters[Math.floor(Math.random() * characters.length)];
        }
        return id;
    }

    private static createDefaultData(): UserData {
        return {
            userId: undefined,
            name: undefined,
            introCompleted: false,
            solvedCount: 0,
            currentPuzzle: undefined
        };
    }

    private static createDefaultPuzzleData(): PuzzleData {
        return {
            unlocked: false,
            viewed: false,
            solved: false,
            solutionCycles: undefined,
            solutionBytes: undefined,

            code: null
        };
    }

    private static loadObjectWithDefault<T>(key: string, defaultDataCreator: () => T): T {
        let data = Sic1DataManager.cache[key] as T;
        if (!data) {
            try {
                const str = localStorage.getItem(key);
                if (str) {
                    data = JSON.parse(str) as T;
                }
            } catch (e) {}

            data = data || defaultDataCreator();
            Sic1DataManager.cache[key] = data;
        }

        return data;
    }

    private static saveObject(key: string): void {
        try {
            localStorage.setItem(key, JSON.stringify(Sic1DataManager.cache[key]));
        } catch (e) {}
    }

    private static getPuzzleKey(title: string): string {
        return `${Sic1DataManager.prefix}Puzzle_${title}`;
    }

    public static getData(): UserData {
        const state = Sic1DataManager.loadObjectWithDefault<UserData>(Sic1DataManager.prefix, Sic1DataManager.createDefaultData);

        // Ensure user id and name are populated
        state.userId = (state.userId && state.userId.length === Sic1DataManager.userIdLength) ? state.userId : Sic1DataManager.generateUserId();
        state.name = (state.name && state.name.length > 0) ? state.name.slice(0, 50) : Sic1DataManager.defaultName;

        return state;
    }

    public static saveData(): void {
        Sic1DataManager.saveObject(Sic1DataManager.prefix);
    }

    public static getPuzzleData(title: string): PuzzleData {
        return Sic1DataManager.loadObjectWithDefault<PuzzleData>(Sic1DataManager.getPuzzleKey(title), Sic1DataManager.createDefaultPuzzleData);
    }

    public static savePuzzleData(title: string): void {
        Sic1DataManager.saveObject(Sic1DataManager.getPuzzleKey(title));
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
    inputBytes: number[];
    expectedOutputBytes: number[];

    onCompilationError: (error: CompilationError) => void;
    onMenuRequested: () => void;
    onPuzzleCompleted: (cyclesExecuted: number, memoryBytesAccessed: number, programBytes: number[]) => void;
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
}

class Sic1Ide extends React.Component<Sic1IdeProperties, Sic1IdeState> {
    private static autoStepIntervalMS = 40;

    private stateFlags = StateFlags.none;
    private autoStep = false;
    private runToken?: number;
    private memoryMap: number[][];
    private programBytes: number[];
    private emulator: Emulator;

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

        let state: Sic1IdeState = Sic1Ide.createEmptyTransientState();
        this.state = state;
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

    private static getDefaultCode(puzzle: Puzzle) {
        // Load progress (or fallback to default)
        const puzzleData = Sic1DataManager.getPuzzleData(puzzle.title);
        let code = puzzleData.code;
        if (code === undefined || code === null) {
            if (puzzle.code) {
                code = puzzle.code;
            } else {
                code = `; ${puzzle.description}\n`;
            }
        }
        return code;
    }

    private getLongestIOTable(): number[] {
        const a = this.props.inputBytes;
        const b = this.props.expectedOutputBytes;
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
            const cycles = this.emulator.getCyclesExecuted();
            const bytes = this.emulator.getMemoryBytesAccessed();
            this.props.onPuzzleCompleted(cycles, bytes, this.programBytes);

            // TODO: Could this be moved to Sic1Root?
            // Mark as solved in persistent state
            const puzzle = this.props.puzzle;
            const puzzleData = Sic1DataManager.getPuzzleData(puzzle.title);
            if (!puzzleData.solved) {
                const data = Sic1DataManager.getData();
                data.solvedCount++;
                puzzleData.solved = true;
                puzzleData.solutionCycles = cycles;
                puzzleData.solutionBytes = bytes;

                Sic1DataManager.saveData();
                Sic1DataManager.savePuzzleData(puzzle.title);
            } else if (cycles < puzzleData.solutionCycles || bytes < puzzleData.solutionBytes) {
                // Update stats if they've improved
                puzzleData.solutionCycles = cycles;
                puzzleData.solutionBytes = bytes;
                Sic1DataManager.savePuzzleData(puzzle.title);
            }
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
            const sourceLines = this.inputCode.current.value.split("\n");
            this.setState({ sourceLines });

            this.setStateFlags(StateFlags.none);

            let inputIndex = 0;
            let outputIndex = 0;
            let done = false;
            const assembledProgram = Assembler.assemble(sourceLines);

            this.programBytes = assembledProgram.bytes.slice();
            this.emulator = new Emulator(assembledProgram, {
                readInput: () => {
                    var value = (inputIndex < this.props.inputBytes.length) ? this.props.inputBytes[inputIndex] : 0;
                    inputIndex++;
                    return value;
                },

                writeOutput: (value) => {
                    if (outputIndex < this.props.expectedOutputBytes.length) {
                        this.setState(state => ({ actualOutputBytes: [...state.actualOutputBytes, value] }));

                        if (value !== this.props.expectedOutputBytes[outputIndex]) {
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

                        if (++outputIndex == this.props.expectedOutputBytes.length) {
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
                this.props.onCompilationError(error);
            } else {
                throw error;
            }
        }
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
        this.props.onMenuRequested();
    }

    public isRunning(): boolean {
        return !!(this.stateFlags & StateFlags.running);
    }

    public isExecuting(): boolean {
        return this.autoStep;
    }

    public reset() {
        this.setState(Sic1Ide.createEmptyTransientState());
        this.setStateFlags(StateFlags.none);
    }

    public saveProgress() {
        if (this.inputCode.current) {
            const puzzle = this.props.puzzle;
            let code = this.inputCode.current.value;
            if (code === puzzle.code) {
                code = null;
            }

            const puzzleData = Sic1DataManager.getPuzzleData(puzzle.title);
            if (puzzleData.code !== code) {
                puzzleData.code = code;
                Sic1DataManager.savePuzzleData(puzzle.title);
            }
        }
    }

    public pause = () => {
        this.autoStep = false;
    }

    public stop = () => {
        this.autoStep = false;
        this.reset();
        this.setStateFlags(StateFlags.none);
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
                    <tr><th>{this.props.puzzle.title}</th></tr>
                    <tr><td className="text">{this.props.puzzle.description}</td></tr>
                </table>
                <br />
                <div className="ioBox">
                    <table>
                        <thead><tr><th>In</th><th>Expected</th><th>Actual</th></tr></thead>
                        <tbody>
                            {
                                this.getLongestIOTable().map((x, index) => <tr>
                                    <td>{(index < this.props.inputBytes.length) ? this.props.inputBytes[index] : null}</td>
                                    <td className={this.state.unexpectedOutputIndexes[index] ? "attention" : ""}>{(index < this.props.expectedOutputBytes.length) ? this.props.expectedOutputBytes[index] : null}</td>
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
                <textarea
                    ref={this.inputCode}
                    key={this.props.puzzle.title}
                    className={"input" + (this.isRunning() ? " hidden" : "")}
                    spellCheck={false}
                    wrap="off"
                    defaultValue={Sic1Ide.getDefaultCode(this.props.puzzle)}
                    onBlur={() => this.saveProgress()}
                    ></textarea>
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
                    this.memoryMap.map(row => <tr>{row.map(index => <td className={(index >= this.state.currentAddress && index < this.state.currentAddress + Constants.subleqInstructionBytes) ? "emphasize" : ""}>{hexifyByte(this.state[index])}</td>)}</tr>)
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

type ParameterList<T> = {[K in keyof T]: string | number | boolean | undefined | null};

class Sic1Service {
    private static readonly root = "https://sic1-db.netlify.com/.netlify/functions/api";
    // private static readonly root = "http://localhost:8888/.netlify/functions/api"; // Local test server
    private static readonly bucketCount = 20;

    private static createQueryString<T>(o: ParameterList<T>): string {
        let str = "";
        let first = true;
        for (const key in o) {
            const value = o[key];
            if (value !== undefined && value !== null) {
                str += `${first ? "?" : "&"}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                first = false;
            }
        }
        return str;
    }

    private static replaceParameters<T>(path: string, o: ParameterList<T>): string {
        for (const key in o) {
            const value = o[key];
            if (value !== undefined && value !== null) {
                path = path.replace(`:${key}`, encodeURIComponent(value));
            }
        }
        return path;
    }

    private static createUri<P, Q>(path: string, parameters: ParameterList<P>, query: ParameterList<Q>) {
        return Sic1Service.root
            + Sic1Service.replaceParameters(path, parameters)
            + Sic1Service.createQueryString(query);
    }

    private static calculateBounds(min: number, max: number): HistogramBounds {
        // Center the results if they're not spread out very much
        if ((max - min) < Sic1Service.bucketCount) {
            min = Math.max(0, min - (Sic1Service.bucketCount / 2));
        }

        return {
            min,
            max,
            bucketSize: Math.max(1, Math.ceil((max - min + 1) / Sic1Service.bucketCount)),
        }
    }

    private static sortAndNormalizeHistogramData(data: Contract.HistogramData): Contract.HistogramData {
        let min = 0;
        let max = 0;
        if (data.length > 0) {
            min = data[0].bucketMax;
            max = data[0].bucketMax;
            for (const item of data) {
                min = Math.min(min, item.bucketMax);
                max = Math.max(max, item.bucketMax);
            }
        }

        const bounds = Sic1Service.calculateBounds(min, max);
        let buckets: Contract.HistogramDataBucket[] = [];

        // Initialize
        let bucketed: {[bucket: number]: number} = {};
        for (let i = 0; i < Sic1Service.bucketCount; i++) {
            const bucket = bounds.min + (bounds.bucketSize * i);
            bucketed[bucket] = 0;
        }

        // Aggregate
        for (let i = 0; i < data.length; i++) {
            const bucket = Math.floor((data[i].bucketMax - bounds.min) / bounds.bucketSize) * bounds.bucketSize + bounds.min;
            bucketed[bucket] += data[i].count;
        }

        // Project
        for (const bucketMax in bucketed) {
            const count = bucketed[bucketMax];
            buckets.push({
                bucketMax: parseInt(bucketMax),
                count,
            });
        }

        return buckets;
    }

    public static async getPuzzleStats(puzzleTitle: string, cycles: number, bytes: number): Promise<{ cycles: ChartData, bytes: ChartData }> {
        const response = await fetch(
            Sic1Service.createUri<Contract.PuzzleStatsRequestParameters, {}>(
                Contract.PuzzleStatsRoute,
                { testName: puzzleTitle },
                {}),
            {
                method: "GET",
                mode: "cors",
            }
        );

        if (response.ok) {
            const data = await response.json() as Contract.PuzzleStatsResponse;

            // Merge and normalize data
            const cyclesHistogram = Sic1Service.sortAndNormalizeHistogramData(data.cyclesExecutedBySolution.concat([{ bucketMax: cycles, count: 1 }]));
            const bytesHistogram = Sic1Service.sortAndNormalizeHistogramData(data.memoryBytesAccessedBySolution.concat([{ bucketMax: bytes, count: 1 }]));
            return {
                cycles: {
                    histogram: cyclesHistogram,
                    highlightedValue: cycles,
                },
                bytes: {
                    histogram: bytesHistogram,
                    highlightedValue: bytes,
                },
            };
        }
    }

    public static async getUserStats(userId: string): Promise<ChartData> {
        const response = await fetch(
            Sic1Service.createUri<{}, Contract.UserStatsRequestQuery>(
                Contract.UserStatsRoute,
                {},
                { userId },
            ),
            {
                method: "GET",
                mode: "cors",
            }
        );

        if (response.ok) {
            const data = await response.json() as Contract.UserStatsResponse;
            const solutionsHistogram = Sic1Service.sortAndNormalizeHistogramData(data.solutionsByUser);
            return {
                histogram: solutionsHistogram,
                highlightedValue: data.userSolvedCount,
            };
        }
    }

    public static async uploadSolution(userId: string, puzzleTitle: string, cycles: number, bytes: number, programBytes: number[]): Promise<void> {
        const programString = programBytes.map(byte => hexifyByte(byte)).join("");
        await fetch(
            Sic1Service.createUri<Contract.SolutionUploadRequestParameters, {}>(
                Contract.SolutionUploadRoute,
                { testName: puzzleTitle },
                {}),
            {
                method: "POST",
                mode: "cors",
                body: JSON.stringify(identity<Contract.SolutionUploadRequestBody>({
                    userId,
                    solutionCycles: cycles,
                    solutionBytes: bytes,
                    program: programString,
                })),
            }
        );
    }
}

class Sic1Intro extends React.Component<{ onCompleted: (name: string) => void }> {
    private inputName = React.createRef<HTMLInputElement>();

    public render() {
        const submit = () => this.props.onCompleted(this.inputName.current.value);

        return <>
            <h1>Welcome to SIC Systems!</h1>
            <h2>Job Description</h2>
            <p>SIC Systems is looking for programmers to produce highly efficient programs for their flagship product: the Single Instruction Computer Mark 1 (SIC-1).</p>
            <p>Note that you will be competing against other engineers to produce the fastest and smallest programs.</p>
            <h2>Job Application</h2>
            <p>Please provide your name:</p>
            <p>
                <form onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}>
                    <input ref={this.inputName} defaultValue={Sic1DataManager.defaultName} />
                </form>
            </p>
            <p>Then click this link to: <a href="#" onClick={(event) => {
                event.preventDefault();
                submit();
            }}>apply for the job</a>.</p>
        </>;
    }
}

interface Sic1RootPuzzleState {
    puzzle: Puzzle;
    inputBytes: number[];
    expectedOutputBytes: number[];
}

interface Sic1RootState extends Sic1RootPuzzleState {
    messageBoxContent?: MessageBoxContent;
}

class Sic1Root extends React.Component<{}, Sic1RootState> {
    private ide = React.createRef<Sic1Ide>();

    constructor(props) {
        super(props);

        // Load previous puzzle, if available
        let puzzle = puzzles[0].list[0];
        const previousPuzzleTitle = Sic1DataManager.getData().currentPuzzle;
        if (previousPuzzleTitle) {
            const previousPuzzle = ([] as Puzzle[]).concat(...puzzles.map(group => group.list)).find(puzzle => puzzle.title === previousPuzzleTitle);
            puzzle = previousPuzzle || puzzle;
        }

        this.state = Sic1Root.getStateForPuzzle(puzzle);
    }

    private static getStateForPuzzle(puzzle: Puzzle): Sic1RootPuzzleState {
        // TODO: Shuffle order
        const inputBytes = [].concat(...puzzle.io.map(row => row[0]));
        const expectedOutputBytes = [].concat(...puzzle.io.map(row => row[1]));
        return {
            puzzle,
            inputBytes,
            expectedOutputBytes,
        }
    }

    private loadPuzzle(puzzle: Puzzle): void {
        // Save progress on previous puzzle
        if (this.ide.current) {
            this.ide.current.saveProgress();
        }

        // Save as last open puzzle
        const data = Sic1DataManager.getData();
        if (data.currentPuzzle !== puzzle.title) {
            data.currentPuzzle = puzzle.title;
            Sic1DataManager.saveData();
        }

        // Mark new puzzle as viewed
        const puzzleData = Sic1DataManager.getPuzzleData(puzzle.title);
        if (!puzzleData.viewed) {
            puzzleData.viewed = true;
            Sic1DataManager.savePuzzleData(puzzle.title);
        }

        this.setState(Sic1Root.getStateForPuzzle(puzzle));
        if (this.ide.current) {
            this.ide.current.reset();
        }
        this.closeMessageBox();
    }

    private keyUpHandler = (event: KeyboardEvent) => {
        if (event.keyCode === 27) { // Escape key
            if (this.state.messageBoxContent && this.state.messageBoxContent.modal !== false) {
                this.closeMessageBox();
            } else if (this.ide.current && this.ide.current.isExecuting()) {
                this.ide.current.pause();
            } else if (this.ide.current && this.ide.current.isRunning()) {
                this.ide.current.stop();
            } else {
                this.showPuzzleList();
            }
        }
    }

    private showIntro2(name: string) {
        this.setState({ messageBoxContent: {
            title: "You're Hired!",
            body: <>
                <h2>Congratulations!</h2>
                <p>Congratulations, {name}! SIC Systems has accepted your application. Introductory information and your first assignment are below.</p>
                <h2>Introducing the SIC-1</h2>
                <p>The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").</p>
                <p>Note that you can view the program inventory by clicking the "Menu" button or hitting ESC.</p>
                <p>Click this link to: <a href="#" onClick={(event) => {
                    event.preventDefault();

                    const data = Sic1DataManager.getData();
                    data.name = name;
                    data.introCompleted = true;
                    Sic1DataManager.saveData();

                    this.loadPuzzle(puzzles[0].list[0]);
                    this.closeMessageBox();
                }}>get started with your first SIC-1 program</a>.</p>
            </>,
        }});
    }

    private showIntro() {
        this.setState({ messageBoxContent: {
            title: "Welcome!",
            body: <><Sic1Intro onCompleted={(name) => this.showIntro2(name)} /></>,
        }});
    }

    private showResume() {
        this.setState({ messageBoxContent: {
            title: "Welcome Back!",
            body: <>
                <h2>Welcome back, {Sic1DataManager.getData().name}!</h2>
                <p>For motivational purposes, here is how the number of tasks you've completed compares to other engineers.</p>
                <Chart title="Completed Tasks" promise={Sic1Service.getUserStats(Sic1DataManager.getData().userId)} />
                <p>Click this link to: <a href="#" onClick={(event) => {
                    event.preventDefault();
                    this.showPuzzleList();
                }}>go to the program inventory</a>.</p>
            </>,
        }});
    }

    private showSuccessMessageBox(cycles: number, bytes: number, programBytes: number[]): void {
        const promise = Sic1Service.getPuzzleStats(this.state.puzzle.title, cycles, bytes);

        // Upload after getting stats (regardless of error or not)
        // TODO: Only upload if better result?
        const uploadResult = () => Sic1Service.uploadSolution(Sic1DataManager.getData().userId, this.state.puzzle.title, cycles, bytes, programBytes);
        promise
            .then(uploadResult)
            .catch(uploadResult);

        this.showMessageBox({
            title: "Success",
            modal: true,
            body: <>
                <h2>Well done!</h2>
                <p>Your program produced the correct output.</p>
                <p>Performance statistics of your program (as compared to others' programs):</p>
                <div className="charts">
                    <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
                    <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
                </div>
                <p>Click this link to: <a href="#" onClick={(event) => {
                    event.preventDefault();
                    this.showPuzzleList();
                }}>go to the program inventory</a>.</p>
            </>,
        });
    }

    private showCompilationError(error: CompilationError): void {
        this.showMessageBox({
            title: "Compilation Error",
            body: <>
                <h2>Compilation Error!</h2>
                <p>{error.message}</p>
            </>,
        });
    }

    private start() {
        const data = Sic1DataManager.getData();
        if (data.introCompleted) {
            this.showResume();
        } else {
            this.showIntro();
        }
    }

    private filterUnlockedPuzzles(list: Puzzle[]) {
        const data = Sic1DataManager.getData();
        return list
            .map(puzzle => {
                const puzzleData = Sic1DataManager.getPuzzleData(puzzle.title);

                // Check for unlock
                if (!puzzleData.unlocked) {
                    if (data.solvedCount >= puzzle.minimumSolvedToUnlock) {
                        puzzleData.unlocked = true;
                        Sic1DataManager.savePuzzleData(puzzle.title);
                    }
                }

                if (puzzleData.unlocked) {
                    return {
                        puzzle,
                        puzzleData,
                    };
                }
                return null;
            })
            .filter(puzzleInfo => !!puzzleInfo);
    }

    private createPuzzleLink(puzzleInfo: { puzzle: Puzzle, puzzleData: PuzzleData }): React.ReactFragment {
        const { puzzle, puzzleData } = puzzleInfo;
        return <>
            <a href="#" onClick={(event) => {
                event.preventDefault();
                this.loadPuzzle(puzzle);
            }}>{puzzle.title}</a>
            {
                (puzzleData.solved && puzzleData.solutionCycles && puzzleData.solutionBytes)
                ? ` (SOLVED; cycles: ${puzzleData.solutionCycles}, bytes: ${puzzleData.solutionBytes})`
                : (
                    (!puzzleData.viewed)
                    ? " (NEW)"
                    : ""
                )
            }
        </>;
    }

    private showPuzzleList() {
        // Filter to unlocked groups and puzzles
        let groupInfos = puzzles.map(group => ({
            group,
            puzzleInfos: this.filterUnlockedPuzzles(group.list),
        })).filter(groupInfo => (groupInfo.puzzleInfos.length > 0));

        this.setState({ messageBoxContent: {
            title: "Program Inventory",
            body: <>
                <p>SIC Systems requires you to implement the following programs:</p>
                {groupInfos.map(groupInfo => <ol>
                    <li>
                        {groupInfo.group.groupTitle}
                        <ol>
                            {groupInfo.puzzleInfos.map(puzzleInfo => <li>{this.createPuzzleLink(puzzleInfo)}</li>)}
                        </ol>
                    </li>
                </ol>)}
            </>,
        }});
    }

    private showMessageBox(messageBoxContent: MessageBoxContent) {
        this.setState({ messageBoxContent });
    }

    private closeMessageBox() {
        this.setState({ messageBoxContent: null });
    }

    public componentDidMount() {
        window.addEventListener("keyup", this.keyUpHandler);
        this.start();
    }

    public componentWillUnmount() {
        window.removeEventListener("keyup", this.keyUpHandler);
    }

    public render() {
        const messageBoxContent = this.state.messageBoxContent;
        return <>
            <Sic1Ide
                ref={this.ide}
                puzzle={this.state.puzzle}
                inputBytes={this.state.inputBytes}
                expectedOutputBytes={this.state.expectedOutputBytes}

                onCompilationError={(error) => this.showCompilationError(error)}
                onMenuRequested={() => this.showPuzzleList()}
                onPuzzleCompleted={(cycles, bytes, programBytes) => this.showSuccessMessageBox(cycles, bytes, programBytes)}
                />
            {
                messageBoxContent
                ? <MessageBox
                    title={messageBoxContent.title}
                    modal={messageBoxContent.modal}
                    body={messageBoxContent.body}
                    onDismissed={() => this.closeMessageBox()}
                    />
                : null
            }
        </>;
    }
}

ReactDOM.render(<Sic1Root />, document.getElementById("root"));
