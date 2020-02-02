import { CompilationError } from "../../../lib/src/sic1asm";
import { Puzzle } from "./puzzle";
import { puzzles } from "./puzzles";
import { MessageBox, MessageBoxContent } from "./message-box";
import { Shared, TestSet } from "./shared";
import { Chart } from "./chart";
import { Sic1DataManager, PuzzleData } from "./data-manager";
import { Sic1Service } from "./service";
import { Sic1Ide } from "./ide";
declare const React: typeof import("react");

// TODO: Consider moving autoStep to state and having a "pause" button instead of "run"

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
                    <input ref={this.inputName} defaultValue={Shared.defaultName} />
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
    testSets: TestSet[];
    defaultCode: string;
}

interface Sic1RootState extends Sic1RootPuzzleState {
    messageBoxContent?: MessageBoxContent;
}

export class Sic1Root extends React.Component<{}, Sic1RootState> {
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

    private static getStateForPuzzle(puzzle: Puzzle): Sic1RootPuzzleState {
        const testSets: TestSet[] = [];

        // Fixed tests
        testSets.push({
            inputBytes: [].concat(...puzzle.io.map(row => row[0])),
            expectedOutputBytes: [].concat(...puzzle.io.map(row => row[1])),
        });

        // Random tests, if applicable
        const test = puzzle.test;
        if (test) {
            const input = test.createRandomTest();
            const output = test.getExpectedOutput(input);
            testSets.push({
                inputBytes: [].concat(...input),
                expectedOutputBytes: [].concat(...output),
            });
        }

        return {
            puzzle,
            testSets,
            defaultCode: Sic1Root.getDefaultCode(puzzle),
        };
    }

    private saveProgress(): void {
        if (this.ide.current) {
            const puzzle = this.state.puzzle;
            let code = this.ide.current.getCode();
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

    private loadPuzzle(puzzle: Puzzle): void {
        // Save progress on previous puzzle
        this.saveProgress();

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

    private puzzleCompleted(cycles: number, bytes: number, programBytes: number[]): void {
        this.showSuccessMessageBox(cycles, bytes, programBytes);

        // Mark as solved in persistent state
        const puzzle = this.state.puzzle;
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
            // TODO: Track these separately?
            puzzleData.solutionCycles = cycles;
            puzzleData.solutionBytes = bytes;
            Sic1DataManager.savePuzzleData(puzzle.title);
        }
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
                {
                    error.context
                    ?
                        <>
                            <p>On line {error.context.sourceLineNumber}:</p>
                            <p>{error.context.sourceLine}</p>
                        </>
                    : null
                }
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
                testSets={this.state.testSets}
                defaultCode={this.state.defaultCode}

                onCompilationError={(error) => this.showCompilationError(error)}
                onMenuRequested={() => this.showPuzzleList()}
                onPuzzleCompleted={(cycles, bytes, programBytes) => this.puzzleCompleted(cycles, bytes, programBytes)}
                onSaveRequested={() => this.saveProgress()}
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
