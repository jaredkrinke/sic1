import { CompilationError } from "sic1asm";
import { Puzzle, puzzles } from "sic1-shared";
import { MessageBox, MessageBoxContent } from "./message-box";
import { Shared } from "./shared";
import { Chart, ChartState } from "./chart";
import { ChartData } from "./chart-model";
import { Sic1DataManager, PuzzleData, UserData } from "./data-manager";
import { Sic1Service, LeaderboardEntry } from "./service";
import { Sic1Ide } from "./ide";
import licenses from "./licenses";
import { Component, ComponentChild, ComponentChildren, createRef } from "preact";

// TODO: Consider moving autoStep to state and having a "pause" button instead of "run"

class TextButton extends Component<{ text: string, onClick: () => void }> {
    constructor(props) {
        super(props);
    }

    public render() {
        return <a href="#" onClick={(event) => {
            event.preventDefault();
            this.props.onClick();
        }}>{this.props.text}</a>
    }
}

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
                <label>Name: <input ref={this.inputName} autoFocus={true} maxLength={Sic1Service.userNameMaxLength} defaultValue={data.name || Shared.defaultName} /></label>
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
                        <td className={"text" + ((row.name.length > 0) ? "" : " deemphasize")}>{(row.name.length > 0) ? `${row.name} (${Sic1Root.getJobTitleForSolvedCount(row.solved)})` : "(anonymous)"}</td>
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

function setFullscreen(fullscreen: boolean): void {
    if (fullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

class Sic1PresentationSettings extends Component<{}> {
    public render(): ComponentChild {
        return <>
            <form onSubmit={(event) => event.preventDefault()}>
                <h2>Display Settings</h2>
                <p><label><input type="checkbox" onChange={(event) => setFullscreen(event.currentTarget.checked) } defaultChecked={!!document.fullscreenElement} /> Fullscreen</label></p>
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
    // Job titles and promotion messages
    private static readonly jobTitles: { title: string, minimumSolved: number }[] = [
        { title: "Trainee", minimumSolved: 0 },
        { title: "Engineer", minimumSolved: 3 },
        { title: "Engineer II", minimumSolved: 8 },
        { title: "Senior Engineer", minimumSolved: 13 },
        { title: "Principal Engineer", minimumSolved: 18 },
        { title: "Partner Engineer", minimumSolved: 26 },
        { title: "Technical Fellow Emeritus", minimumSolved: 30 },
    ];

    private static readonly promotionMessages: ((data: UserData) => ComponentChildren)[] = [
        data => <><p>Congratulations, {data.name}! In recognition of your contributions to SIC Systems, you have been promoted to {Sic1Root.getJobTitle(data)}.</p></>,

        // Engineer
        data => <><p>Thanks for completing your introductory training assignments, {data.name}! Your starting job title is: {Sic1Root.getJobTitle(data)}.</p><p>Please get started
            on your assignments right away.</p></>,

        // Engineer II
        data => <><p>Nice work on the arithmetic programs, {data.name}! As of this email, you have been promoted to {Sic1Root.getJobTitle(data)}.</p><p>Please continue your work.
            We expect great things from you!</p></>,

        // Senior Engineer
        data => <><p>Impressive work, {data.name}! Based on your stellar performance, I'm promoting you to {Sic1Root.getJobTitle(data)}.</p><p>Your next couple of assignments are
            very important (and difficult), so please get started as soon as you can. Thanks for taking the time to prioritize this work over competing demands in your personal
            life!</p></>,

        // Principal Engineer
        data => <><p>Spectacular work, {data.name}! Based on your innovative solutions, you are being promoted to {Sic1Root.getJobTitle(data)}.</p><p>Your new assignments are on
            the bleeding edge of SIC Systems research. Welcome to the exciting world of natural language processing! As always, we greatly appreciate your willingness to work
            night and day to make SIC Systems more profitable! Even though it's getting late in the day, if you could continue your work, that would be super helpful.
            Thanks!</p></>,

        // Partner Engineer
        data => <><p>Incredible work, {data.name}! After consulting with the SIC Systems board, I've been given special permission to promote you to {Sic1Root.getJobTitle(data)}.
            </p><p>You've shown tenacity to get this far, and you'll need loads of it for the next batch of tasks. We need to give the SIC-1 the ability to understand its own
            code, in order to unleash its immense computing power on optimizing its own performance. We'll be happy to provide on-site food and laundry service, home
            cleaning/maintenance, and fertility preservation services to you as part of your compensation package. We just need you to push through this one last sprint to
            the finish line. Your fellow SIC Systems family members thank you for your perseverance!</p></>,

        // Technical Fellow Emeritus
        data => <><p>Truly amazing work, {data.name}! The SIC Systems board unanimously voted to create a new title just for you: {Sic1Root.getJobTitle(data)}.</p><p>Thank you
            from the bottom of my heart for all of the sacrifices you've made to get us to this point. The SIC-1 is now able to reason about its own code. This is an
            amazing breakthrough and you should be very proud.</p><p>Now that we've reached this exciting milestone (thanks to your tireless efforts!), SIC Systems honestly can't
            challenge someone with your peerless talent. Excitingly, you can now begin the next phase of your career at one of the many other technology companies around the world.
            I know parting ways is tough, but SIC Systems is a business, not a family, so we have to say goodbye to employees once they're no longer needed. Thank you one last
            time, and best of luck in your future endeavors!</p></>,
    ];

    private ide = createRef<Sic1Ide>();
    private userProfileForm = createRef<Sic1UserProfileForm>();

    constructor(props) {
        super(props);

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
        return Sic1Root.getJobTitleForSolvedCount(data.solvedCount);
    }

    private static getPromotionMessage(data: UserData): ComponentChildren {
        // TODO: Is this the same as promotionMessages[0]? Can that be used here instead?
        let message: ComponentChildren = <><p>Congratulations, {data.name}! In recognition of your contributions to SIC Systems, you have been promoted to {Sic1Root.getJobTitle(data)}.</p></>;
        for (let i = 0; i < Sic1Root.jobTitles.length; i++) {
            const row = Sic1Root.jobTitles[i];
            if (data.solvedCount >= row.minimumSolved) {
                message = Sic1Root.promotionMessages[i](data);
            }
        }
        return message;
    }

    public static getJobTitleForSolvedCount(solvedCount: number): string {
        let title = "";
        for (const row of Sic1Root.jobTitles) {
            if (solvedCount >= row.minimumSolved) {
                title = row.title;
            }
        }
        return title;
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
        let previousJobTitle: string;
        let jobTitleChanged = false;
        if (!puzzleData.solved) {
            const data = Sic1DataManager.getData();
            previousJobTitle = Sic1Root.getJobTitle(data);
            data.solvedCount++;
            const newJobTitle = Sic1Root.getJobTitle(data);
            jobTitleChanged = (previousJobTitle !== newJobTitle);

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

        // Queue a promotion message so that the user sees next, even if they hit escape to dismiss
        if (jobTitleChanged) {
            this.messageBoxPush(this.createMessagePromotion());
        }

        this.messageBoxPush(this.createMessageSuccess(cycles, bytes, programBytes, jobTitleChanged, previousJobTitle));
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
        } else if (event.altKey && event.key === "Enter") {
            setFullscreen(!document.fullscreenElement);
        }
    }

    private createMessageEmail(subject: string, body: ComponentChildren, from?: string, jobTitleOverride?: string): MessageBoxContent {
        const data = Sic1DataManager.getData();
        return {
            title: "New Email",
            body: <>
                TO: {data.name} ({jobTitleOverride || Sic1Root.getJobTitle(data)})<br />
                FROM: {from ? from : "Jerin Kransky (Director of Engineering)"}<br />
                DATE: {(new Date()).toLocaleString()}<br />
                SUBJECT: {subject}<br />
                {body}
            </>,
        };
    }

    private createMessageIntro2(name: string): MessageBoxContent {
        return this.createMessageEmail("Welcome to the team!", <>
            <p>Congratulations, {name}! SIC Systems has accepted your application. Introductory information and your first assignment are below.</p>
            <p>Introducing the SIC-1</p>
            <p>The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").</p>
            <p>Note that you can view the program inventory by clicking the "Menu" button or hitting ESC.</p>
            <p>Click the following link:</p>
            <p>&gt; <TextButton text="Get started with your first SIC-1 program" onClick={() => {
                this.loadPuzzle(puzzles[0].list[0]);
            }} /></p>
        </>);
    }

    private updateUserProfile(name: string, uploadName: boolean, callback: () => void) {
        const data = Sic1DataManager.getData();
        data.name = name;
        data.uploadName = uploadName;
        data.introCompleted = true;
        Sic1DataManager.saveData();

        // No need to wait for completion
        Sic1Service.updateUserProfileAsync(data.userId, uploadName ? name : "").catch(() => {});

        callback();
    }

    private createMessageIntro(): MessageBoxContent {
        return {
            title: "Welcome!",
            modal: true,
            body: <>
                <h1>Welcome to SIC Systems!</h1>
                <h2>Job Description</h2>
                <p>SIC Systems is looking for programmers to produce highly efficient programs for their flagship product: the Single Instruction Computer Mark 1 (SIC-1).</p>
                <p>Note that you will be competing against other engineers to produce the fastest and smallest programs.</p>
                <h2>Job Application</h2>
                <p><Sic1UserProfileForm ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.messageBoxReplace(this.createMessageIntro2(name)))} /></p>
                <h2>Instructions</h2>
                <p>After completing the form above, click the following link to submit your job application:</p>
                <p>&gt; <TextButton text="Apply for the job" onClick={() => this.userProfileForm.current.submit()} /></p>
            </>
        };
    }

    private getUserStatsFragment(): ComponentChildren {
        return <>
            <p>For motivational purposes, here is how the number of tasks you have completed compares to other engineers.</p>
            <Sic1UserStats promise={Sic1Service.getUserStatsAsync(Sic1DataManager.getData().userId)} />
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
                </ul>
                <ul>
                    <li><TextButton text="View User Statistics" onClick={() => this.messageBoxPush(this.createMessageUserProfile()) } /></li>
                    <li><TextButton text="View Leaderboard" onClick={() => this.messageBoxPush(this.createMessageLeaderboard()) } /></li>
                </ul>
                <ul>
                    <li><TextButton text="Edit User Settings" onClick={() => this.messageBoxPush(this.createMessageUserProfileEdit()) } /></li>
                    <li><TextButton text="Edit Presentation Settings" onClick={() => this.messageBoxPush(this.createMessagePresentationSettings()) } /></li>
                </ul>
                <ul>
                <li><TextButton text="View SIC-1 Credits" onClick={() => this.messageBoxPush(this.createMessageCredits()) } /></li>
                </ul>
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
                <h2>Software Library Licenses</h2>
                <pre className="licenses">{licenses}</pre>
            </>,
        };
    }

    private createMessageCredits(): MessageBoxContent {
        function Credit(props: { title: string, entries: { link: string, name: string }[] }) {
            return <>
                <h3 className="credit">{props.title}</h3>
                {props.entries.map(({ link, name }) => <p className="credit"><a href={link}>{name}</a></p>)}
            </>;
        }

        return {
            title: "Credits",
            body: <>
                <Credit title="Game Design, Development" entries={[{ link: "https://www.schemescape.com/", name: "Jared Krinke" }]} />
                <Credit title="Inspiration" entries={[{ link: "https://www.zachtronics.com/tis-100/", name: "TIS-100 (Zachtronics)" }]} />
                <p>To view software library licenses, <TextButton text="click here" onClick={() => this.messageBoxPush(this.createMessageLicenses())} />.</p>
            </>,
        };
    }

    private createMessageResume(): MessageBoxContent {
        return this.createMessageEmail("Welcome back!", <>
            <p>Welcome back, {Sic1DataManager.getData().name}. SIC Systems appreciates your continued effort.</p>
            {this.getUserStatsFragment()}
            <p>Click the following link:</p>
            <p>&gt; <TextButton text="Go to the program inventory" onClick={() => this.messageBoxReplace(this.createMessagePuzzleList()) } /></p>
        </>, "SIC Systems Personalized Greeting")
    }

    private createMessagePromotion(): MessageBoxContent {
        return this.createMessageEmail("Promotion", <>
            {Sic1Root.getPromotionMessage(Sic1DataManager.getData())}

            <p>Click this link:</p>
            <p>&gt; <TextButton text="Go to the program inventory" onClick={() => this.messageBoxReplace(this.createMessagePuzzleList()) } /></p>
        </>, null);
    }

    private createMessageSuccess(cycles: number, bytes: number, programBytes: number[], promoted: boolean, oldJobTitle: string): MessageBoxContent {
        return this.createMessageEmail("Well done!", <>
            <p>Your program produced the correct output. Thanks for your contribution to SIC Systems!</p>
            <p>Here are performance statistics of your program (as compared to others' programs):</p>
            {
                // Upload after getting stats (regardless of error or not)
                // TODO: Only upload if better result?
                this.createPuzzleCharts(this.state.puzzle.title, cycles, bytes, () => {
                    Sic1Service.uploadSolutionAsync(Sic1DataManager.getData().userId, this.state.puzzle.title, cycles, bytes, programBytes).catch(() => {});
                })
            }
            <p>Click this link:</p>
            {
                promoted
                ? <p>&gt; <TextButton text="View a new message from your manager" onClick={() => this.messageBoxPop() } /></p>
                : <p>&gt; <TextButton text="Go to the program inventory" onClick={() => this.messageBoxReplace(this.createMessagePuzzleList()) } /></p>
            }
        </>, "SIC-1 Automated Task Management", oldJobTitle);
    }

    private createMessageLeaderboard(): MessageBoxContent {
        const promise = Sic1Service.getLeaderboardAsync();
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
        const promise = Sic1Service.getPuzzleStatsAsync(puzzleTitle, cycles, bytes);
        if (continuation) {
            promise.then(continuation).catch(continuation);
        }

        return <div className="charts">
            <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
            <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
        </div>;
    }

    private createMessagePuzzleStats(puzzle: Puzzle, puzzleData: PuzzleData): MessageBoxContent {
        const promise = Sic1Service.getPuzzleStatsAsync(puzzle.title, puzzleData.solutionCycles, puzzleData.solutionBytes);

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
                DATE: {(new Date()).toLocaleString()}<br />
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
        this.start();
    }

    public componentWillUnmount() {
        window.removeEventListener("keyup", this.keyUpHandler);
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
