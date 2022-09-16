import { CompilationError } from "sic1asm";
import { Puzzle, puzzles } from "sic1-shared";
import { Platform } from "./platform";
import { MessageBox, MessageBoxContent } from "./message-box";
import { Shared } from "./shared";
import { TextButton } from "./text-button";
import { Chart, ChartState } from "./chart";
import { ChartData } from "./chart-model";
import { Sic1DataManager, PuzzleData, UserData } from "./data-manager";
import { LeaderboardEntry, Sic1WebService } from "./service";
import { Sic1Ide } from "./ide";
import { updateMailListForSolvedCount } from "./mail";
import { MailViewer } from "./mail-viewer";
import licenses from "./licenses";
import { Component, ComponentChild, ComponentChildren, createRef } from "preact";

// TODO: Consider moving autoStep to state and having a "pause" button instead of "run"

class Sic1UserProfileForm extends Component<{ onCompleted: (name: string, uploadName: boolean) => void }> {
    private inputName = createRef<HTMLInputElement>();
    private inputUploadName = createRef<HTMLInputElement>();

    public submit() {
        this.props.onCompleted(this.inputName.current.value, this.inputUploadName.current.checked);
    }

    public render() {
        const data = Sic1DataManager.getData();

        return <form onSubmit={(event) => {
                event.preventDefault();
                this.submit();
            }}>
                <label>Name: <input ref={this.inputName} autoFocus={true} maxLength={Sic1WebService.userNameMaxLength} defaultValue={data.name || Shared.defaultName} /></label>
                <p><label><input ref={this.inputUploadName} type="checkbox" defaultChecked={(typeof(data.uploadName) === "boolean") ? data.uploadName : true} /> Show my name in public leaderboards (if unchecked, your statistics will be shown without a name)</label></p>
            </form>;
    }
}

interface Sic1UserStatsState {
    chartState: ChartState;
    data?: ChartData;
}

class Sic1UserStats extends Component<{ promise: Promise<ChartData> }, Sic1UserStatsState> {
    constructor(props) {
        super(props);
        this.state = { chartState: ChartState.loading };
    }

    public async componentDidMount() {
        try {
            this.setState({
                chartState: ChartState.loaded,
                data: await this.props.promise,
            });
        } catch (error) {
            this.setState({ chartState: ChartState.loadFailed });
        }
    }

    public render() {
        // Calculate rank
        let count = 0;
        let worse = 0;
        if (this.state.data) {
            const histogram = this.state.data.histogram;
            const highlightedValue = this.state.data.highlightedValue;
            for (let i = 0; i < histogram.length; i++) {
                const bucket = histogram[i];
                count += bucket.count;

                if (bucket.bucketMax <= highlightedValue) {
                    worse += bucket.count;
                }
            }
        }

        const rank = Math.min(count, count - (worse - 1));

        return <>
            <p>Rank: {this.state.data ? `${rank} out of ${count}` : "(loading...)"}</p>
            <div className="charts">
                <Chart title="Completed Tasks" promise={this.props.promise} />
            </div>
        </>;
    }
}

interface Sic1LeaderboardState {
    chartState: ChartState;
    data?: LeaderboardEntry[];
}

class Sic1Leaderboard extends Component<{ promise: Promise<LeaderboardEntry[]> }, Sic1LeaderboardState> {
    constructor(props) {
        super(props);
        this.state = { chartState: ChartState.loading };
    }

    public async componentDidMount() {
        try {
            this.setState({
                chartState: ChartState.loaded,
                data: await this.props.promise,
            });
        } catch (error) {
            this.setState({ chartState: ChartState.loadFailed });
        }
    }

    public render() {
        let body: ComponentChildren;
        switch (this.state.chartState) {
            case ChartState.loading:
                body = <td colSpan={2} className="center">(Loading...)</td>;
                break;

            case ChartState.loaded:
                body = this.state.data.map(row =>
                    <tr>
                        <td className={"text" + ((row.name.length > 0) ? "" : " deemphasize")}>{(row.name.length > 0) ? `${row.name} (${Shared.getJobTitleForSolvedCount(row.solved)})` : "(anonymous)"}</td>
                        <td>{row.solved}</td>
                    </tr>);
                break;

            default:
                body = <td colSpan={2} className="center">(Load failed)</td>;
                break;
        }

        return <table>
            <thead><tr><th>Name</th><th>Tasks Completed</th></tr></thead>
            <tbody>{body}</tbody>
        </table>;
    }
}

class Sic1PresentationSettings extends Component<{}> {
    public render(): ComponentChild {
        return <>
            <form onSubmit={(event) => event.preventDefault()}>
                <h2>Display Settings</h2>
                <p><label><input type="checkbox" onChange={(event) => Platform.fullscreen.set(event.currentTarget.checked) } defaultChecked={Platform.fullscreen.get()} /> Fullscreen</label></p>
                <p><label>Zoom: </label><input type="range" min={100} max={200} step={10} onChange={(event) => { document.documentElement.style.setProperty("font-size", `${event.currentTarget.value}%`); } } /></p>
            </form>
        </>;
    }
}

interface Sic1RootPuzzleState {
    puzzle: Puzzle;
    defaultCode: string;
}

interface Sic1RootState extends Sic1RootPuzzleState {
    messageBoxQueue: MessageBoxContent[];
}

export class Sic1Root extends Component<{}, Sic1RootState> {
    private ide = createRef<Sic1Ide>();
    private userProfileForm = createRef<Sic1UserProfileForm>();

    constructor(props) {
        super(props);

        // User data migration
        // Update inbox to reflect current solved count
        updateMailListForSolvedCount();

        // Load previous puzzle, if available
        let puzzle = puzzles[0].list[0];
        const previousPuzzleTitle = Sic1DataManager.getData().currentPuzzle;
        if (previousPuzzleTitle) {
            const previousPuzzle = ([] as Puzzle[]).concat(...puzzles.map(group => group.list)).find(puzzle => puzzle.title === previousPuzzleTitle);
            puzzle = previousPuzzle || puzzle;
        }

        const { defaultCode } = Sic1Root.getStateForPuzzle(puzzle);
        this.state ={
            puzzle,
            defaultCode,
            messageBoxQueue: [],
        }
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
        return {
            puzzle,
            defaultCode: Sic1Root.getDefaultCode(puzzle),
        };
    }

    private static getJobTitle(data: UserData): string {
        return Shared.getJobTitleForSolvedCount(data.solvedCount);
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
            this.ide.current.reset(puzzle);
        }

        this.messageBoxClear();
    }

    private puzzleCompleted(cycles: number, bytes: number, programBytes: number[]): void {
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
            // Update stats improved (note: service tracks both best cycles and bytes)
            puzzleData.solutionCycles = Math.min(puzzleData.solutionCycles, cycles);
            puzzleData.solutionBytes = Math.min(puzzleData.solutionBytes, bytes);
            Sic1DataManager.savePuzzleData(puzzle.title);
        }

        // Check for new mail
        const newMail = updateMailListForSolvedCount();

        // Queue the mail viewer so that the user sees next, even if they hit escape to dismiss
        if (newMail) {
            this.messageBoxPush(this.createMessageMailViewer());
        }

        this.messageBoxPush(this.createMessageSuccess(cycles, bytes, programBytes, newMail));
    }

    private toggleMenu() {
        if (this.state.messageBoxQueue.length > 0) {
            if (this.state.messageBoxQueue[0].modal !== true) {
                this.messageBoxPop();
            }
        } else {
            this.messageBoxPush(this.createMessageMenu());
        }
    }

    private keyUpHandler = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            if (this.state.messageBoxQueue.length > 0) {
                if (this.state.messageBoxQueue[0].modal !== true) {
                    this.messageBoxPop();
                }
            } else if (this.ide.current && this.ide.current.isExecuting()) {
                this.ide.current.pause();
            } else if (this.ide.current && this.ide.current.hasStarted()) {
                this.ide.current.stop();
            } else {
                this.messageBoxPush(this.createMessageMenu());
            }
        } else if (event.altKey && event.key === "Enter" || (Platform.app && (event.key === "F11" || event.key === "F4"))) {
            // Fullscreen hotkeys: Alt+Enter (on all platforms), and also F4/F11 for non-web versions
            Platform.fullscreen.set(!Platform.fullscreen.get());
        }
    }

    private createMessageAutomated(subject: string, from: string, body: ComponentChildren): MessageBoxContent {
        const data = Sic1DataManager.getData();
        return {
            title: "Automated Message",
            body: <>
                {MailViewer.createMessageHeader(`${data.name} (${Sic1Root.getJobTitle(data)})`, from, subject)}
                <br />
                {body}
            </>,
        };
    }

    private updateUserProfile(name: string, uploadName: boolean | undefined, callback: () => void) {
        const data = Sic1DataManager.getData();
        data.name = name;
        if (uploadName !== undefined) {
            data.uploadName = uploadName;
        }

        data.introCompleted = true;
        Sic1DataManager.saveData();

        // No need to wait for completion
        Platform.service.updateUserProfileAsync(data.userId, uploadName ? name : "").catch(() => {});

        callback();
    }

    private createMessageIntro(): MessageBoxContent {
        return {
            title: "Welcome!",
            modal: true,
            body: <>
                <h1>Welcome to SIC Systems!</h1>
                <h2>Job Description</h2>
                <p>SIC Systems is looking for programmers to produce highly efficient programs for our flagship product: the Single Instruction Computer Mark 1 (SIC-1).</p>
                <p>You will be competing against other engineers to produce the fastest and smallest programs.</p>
                {
                    Platform.disableUserNameUpload
                    ? <>
                        <p>Click the following link to submit your job application:</p>
                        <p>&gt; <TextButton text="Apply for the job" onClick={() => this.updateUserProfile("", undefined, () => this.messageBoxReplace(this.createMessageMailViewer()))} /></p>
                    </>
                    : <>
                        <h2>Job Application</h2>
                        <p><Sic1UserProfileForm ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.messageBoxReplace(this.createMessageMailViewer()))} /></p>
                        <h2>Instructions</h2>
                        <p>After completing the form above, click the following link to submit your job application:</p>
                        <p>&gt; <TextButton text="Apply for the job" onClick={() => this.userProfileForm.current.submit()} /></p>
                    </>
                }
            </>
        };
    }

    private getUserStatsFragment(): ComponentChildren {
        return <>
            <p>For motivational purposes, here is how the number of tasks you have completed compares to other engineers.</p>
            <Sic1UserStats promise={(async () => {
                const chartData = await Platform.service.getUserStatsAsync(Sic1DataManager.getData().userId);

                // Highlight whatever solvedCount is expected locally. This is currently needed for Steam users (who
                // never upload solutions), but is arguably more user-friendly anyway.
                chartData.highlightedValue = Sic1DataManager.getData().solvedCount;
                return chartData;
            })()} />
        </>;
    }

    private createMessageUserProfileEdit(): MessageBoxContent {
        return {
            title: "User Profile",
            body: <>
                <p>Update your user profile as needed:</p>
                <p><Sic1UserProfileForm ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.messageBoxPop())} /></p>
                <p>
                    &gt; <TextButton text="Save changes" onClick={() => this.userProfileForm.current.submit()} />
                    <br />&gt; <TextButton text="Cancel" onClick={() => this.messageBoxPop()} />
                </p>
            </>,
        };
    }

    private createMessageUserProfile(): MessageBoxContent {
        // TODO: Consider including a computed rank in addition to the user stats chart
        const data = Sic1DataManager.getData();
        return {
            title: "User Profile",
            body: <>
                User: {data.name} ({Sic1Root.getJobTitle(data)})<br />
                {this.getUserStatsFragment()}
            </>,
        };
    }

    private createMessageMenu(): MessageBoxContent {
        return {
            title: "Main Menu",
            body: <>
                <p>Select one of the following options:</p>
                <ul>
                    <li><TextButton text="View Program Inventory" onClick={() => this.messageBoxPush(this.createMessagePuzzleList()) } /></li>
                    <li><TextButton text="View Electronic Mail" onClick={() => this.messageBoxPush(this.createMessageMailViewer()) } /></li>
                </ul>
                <ul>
                    <li><TextButton text="View User Statistics" onClick={() => this.messageBoxPush(this.createMessageUserProfile()) } /></li>
                    <li><TextButton text="View Leaderboard" onClick={() => this.messageBoxPush(this.createMessageLeaderboard()) } /></li>
                </ul>
                <ul>
                    {Platform.disableUserNameUpload ? null : <li><TextButton text="Edit User Settings" onClick={() => this.messageBoxPush(this.createMessageUserProfileEdit()) } /></li>}
                    <li><TextButton text="Edit Presentation Settings" onClick={() => this.messageBoxPush(this.createMessagePresentationSettings()) } /></li>
                </ul>
                <ul>
                <li><TextButton text="View SIC-1 Credits" onClick={() => this.messageBoxPush(this.createMessageCredits()) } /></li>
                </ul>
                {Platform.app ? <ul><li><TextButton text="Exit SIC-1" onClick={() => window.close() } /></li></ul> : null}
            </>,
        };
    }

    private createMessagePresentationSettings(): MessageBoxContent {
        return {
            title: "Presentation",
            body: <Sic1PresentationSettings/>,
        };
    }

    private createMessageLicenses(): MessageBoxContent {
        return {
            title: "Licenses",
            body: <>
                <h2>Third Party Licenses</h2>
                <pre className="licenses">{licenses}</pre>
            </>,
        };
    }

    private createMessageCredits(): MessageBoxContent {
        function Credit(props: { title: string, entries: { link: string, name: string }[] }) {
            return <>
                <h3 className="credit">{props.title}</h3>
                {props.entries.map(({ link, name }) => <p className="credit"><a href={link} target="_blank">{name}</a></p>)}
            </>;
        }

        return {
            title: "Credits",
            body: <>
                <Credit title="Game Design, Development" entries={[{ link: "https://www.antipatterngames.com/", name: "Anti-Pattern Games" }]} />
                <Credit title="Inspiration" entries={[{ link: "https://www.zachtronics.com/", name: "Zachtronics (originators of the \"zachlike\" genre)" }]} />
                <p>To view third party licenses, <TextButton text="click here" onClick={() => this.messageBoxPush(this.createMessageLicenses())} />.</p>
            </>,
        };
    }

    private createMessageResume(): MessageBoxContent {
        return this.createMessageAutomated("Welcome back!", "SIC Systems Personalized Greeting", <>
            <p>Welcome back, {Sic1DataManager.getData().name}. SIC Systems appreciates your continued effort.</p>
            {this.getUserStatsFragment()}
            <p>Click one of following links:</p>
            <p>&gt; <TextButton text="Go to the program inventory" onClick={() => this.messageBoxReplace(this.createMessagePuzzleList()) } /></p>
            <p>&gt; <TextButton text="View electronic mail" onClick={() => this.messageBoxPush(this.createMessageMailViewer()) } /></p>
        </>);
    }

    private createMessageMailViewer(): MessageBoxContent {
        return {
            title: "Electronic Mail",
            body: <MailViewer mails={Sic1DataManager.getData().inbox ?? []} onLoadPuzzleRequested={(puzzle: Puzzle) => this.loadPuzzle(puzzle)} />,
        };
    }

    private createMessageSuccess(cycles: number, bytes: number, programBytes: number[], newMail: boolean): MessageBoxContent {
        return this.createMessageAutomated("Well done!", "SIC-1 Automated Task Management", <>
            <p>Your program produced the correct output. Thanks for your contribution to SIC Systems!</p>
            <p>Here are performance statistics of your program (as compared to others' programs):</p>
            {
                // Upload after getting stats (regardless of error or not)
                // TODO: Only upload if better result?
                this.createPuzzleCharts(this.state.puzzle.title, cycles, bytes, () => {
                    Platform.service.uploadSolutionAsync(Sic1DataManager.getData().userId, this.state.puzzle.title, cycles, bytes, programBytes).catch(() => {});
                })
            }
            {
                newMail
                ? <>
                    <p>You have a new message! Click this link:</p>
                    <p>&gt; <TextButton text="View your new electronic mail" onClick={() => this.messageBoxPop() } /></p>
                </>
                : <>
                    <p>Click this link:</p>
                    <p>&gt; <TextButton text="Go to the program inventory" onClick={() => this.messageBoxReplace(this.createMessagePuzzleList()) } /></p>
                </>
            }
        </>);
    }

    private createMessageLeaderboard(): MessageBoxContent {
        const promise = Platform.service.getLeaderboardAsync();
        return {
            title: "Leaderboard",
            body: <>
                <p>Here are the current top employees of SIC Systems' engineering department:</p>
                <Sic1Leaderboard promise={promise} />
            </>,
        };
    }

    private createMessageCompilationError(error: CompilationError): MessageBoxContent {
        return {
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
        };
    }

    private createMessageHalt(): MessageBoxContent {
        return {
            title: "Program Halted",
            body: <>
                <h2>Program Halted</h2>
                <p>The program halted itself by branching to "@HALT" (address 255).</p>
                <p>All of your assigned tasks require the program to repeat indefinitely, so this is an error that must be corrected.</p>
            </>,
        }
    }

    private start() {
        const data = Sic1DataManager.getData();
        if (data.introCompleted) {
            this.messageBoxPush(this.createMessageResume());
        } else {
            this.messageBoxPush(this.createMessageIntro());
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

    private createPuzzleCharts(puzzleTitle: string, cycles: number, bytes: number, continuation?: () => void): ComponentChildren {
        const promise = Platform.service.getPuzzleStatsAsync(puzzleTitle, cycles, bytes);
        if (continuation) {
            promise.then(continuation).catch(continuation);
        }

        return <div className="charts">
            <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
            <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
        </div>;
    }

    private createMessagePuzzleStats(puzzle: Puzzle, puzzleData: PuzzleData): MessageBoxContent {
        const promise = Platform.service.getPuzzleStatsAsync(puzzle.title, puzzleData.solutionCycles, puzzleData.solutionBytes);

        return {
            title: puzzle.title,
            body: <>
                <p>Here are performance statistics of your program (as compared to others' programs):</p>
                {this.createPuzzleCharts(puzzle.title, puzzleData.solutionCycles, puzzleData.solutionBytes)}
            </>,
        };
    }

    private createPuzzleLink(puzzleInfo: { puzzle: Puzzle, puzzleData: PuzzleData }): ComponentChildren {
        const { puzzle, puzzleData } = puzzleInfo;
        return <>
            <TextButton text={puzzle.title} onClick={() => this.loadPuzzle(puzzle)} />
            {
                (puzzleData.solved && puzzleData.solutionCycles && puzzleData.solutionBytes)
                ? <> (<TextButton text={`SOLVED; cycles: ${puzzleData.solutionCycles}, bytes: ${puzzleData.solutionBytes}`} onClick={() => this.messageBoxPush(this.createMessagePuzzleStats(puzzle, puzzleData)) } />)</>
                : (
                    (!puzzleData.viewed)
                    ? " (NEW)"
                    : ""
                )
            }
        </>;
    }

    private createMessagePuzzleList(): MessageBoxContent {
        // Filter to unlocked groups and puzzles
        let groupInfos = puzzles.map(group => ({
            group,
            puzzleInfos: this.filterUnlockedPuzzles(group.list),
        })).filter(groupInfo => (groupInfo.puzzleInfos.length > 0));

        const data = Sic1DataManager.getData();
        return {
            title: "Program Inventory",
            body: <>
                USER: {data.name} ({Sic1Root.getJobTitle(data)})<br />
                <p>SIC Systems requires you to implement the following programs:</p>
                <ol>
                    {groupInfos.map(groupInfo => <li>
                        {groupInfo.group.groupTitle}
                        <ol>
                            {groupInfo.puzzleInfos.map(puzzleInfo => <li>{this.createPuzzleLink(puzzleInfo)}</li>)}
                        </ol>
                    </li>)}
                </ol>
            </>,
        };
    }

    private messageBoxReplace(messageBoxContent: MessageBoxContent) {
        this.setState(state => ({ messageBoxQueue: [messageBoxContent, ...state.messageBoxQueue.slice(1)] }));
    }

    private messageBoxPush(messageBoxContent: MessageBoxContent)  {
        this.setState(state => ({ messageBoxQueue: [messageBoxContent, ...state.messageBoxQueue] }));
    }

    private messageBoxClear() {
        this.setState(state => ({ messageBoxQueue: [] }));
    }

    private messageBoxPop() {
        this.setState(state => ({ messageBoxQueue: state.messageBoxQueue.slice(1) }));
    }

    public componentDidMount() {
        window.addEventListener("keyup", this.keyUpHandler);
        Platform.onClosing = () => this.saveProgress();
        this.start();
    }

    public componentWillUnmount() {
        window.removeEventListener("keyup", this.keyUpHandler);
        Platform.onClosing = undefined;
    }

    public render() {
        const messageBoxContent = this.state.messageBoxQueue[0];
        return <>
            <Sic1Ide
                ref={this.ide}
                puzzle={this.state.puzzle}
                defaultCode={this.state.defaultCode}

                onCompilationError={(error) => this.messageBoxPush(this.createMessageCompilationError(error)) }
                onHalt={() => this.messageBoxPush(this.createMessageHalt())}
                onMenuRequested={() => this.toggleMenu() }
                onPuzzleCompleted={(cycles, bytes, programBytes) => this.puzzleCompleted(cycles, bytes, programBytes)}
                onSaveRequested={() => this.saveProgress()}
                />
            {
                messageBoxContent
                ? <MessageBox
                    {...messageBoxContent}
                    onDismissed={() => this.messageBoxPop()}
                    />
                : null
            }
        </>;
    }
}
