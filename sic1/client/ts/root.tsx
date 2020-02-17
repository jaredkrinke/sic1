import { CompilationError } from "../../../lib/src/sic1asm";
import { Puzzle } from "./puzzle";
import { puzzles } from "./puzzles";
import { MessageBox, MessageBoxContent } from "./message-box";
import { Shared } from "./shared";
import { Chart } from "./chart";
import { Sic1DataManager, PuzzleData, UserData } from "./data-manager";
import { Sic1Service } from "./service";
import { Sic1Ide } from "./ide";
declare const React: typeof import("react");

// TODO: Consider moving autoStep to state and having a "pause" button instead of "run"

class TextButton extends React.PureComponent<{ text: string, onClick: () => void }> {
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

class Sic1UserProfileForm extends React.Component<{ onCompleted: (name: string, uploadName: boolean) => void }> {
    private inputName = React.createRef<HTMLInputElement>();
    private inputUploadName = React.createRef<HTMLInputElement>();

    public submit() {
        this.props.onCompleted(this.inputName.current.value, this.inputUploadName.current.checked);
    }

    public render() {
        const data = Sic1DataManager.getData();

        return <form onSubmit={(event) => {
                event.preventDefault();
                this.submit();
            }}>
                Name: <input ref={this.inputName} autoFocus={true} maxLength={Sic1Service.userNameMaxLength} defaultValue={data.name || Shared.defaultName} />
                <p><input ref={this.inputUploadName} type="checkbox" defaultChecked={(typeof(data.uploadName) === "boolean") ? data.uploadName : true} /> Show my name in public leaderboards (if unchecked, your statistics will be shown without a name)</p>
            </form>;
    }
}

interface Sic1RootPuzzleState {
    puzzle: Puzzle;
    defaultCode: string;
}

interface Sic1RootState extends Sic1RootPuzzleState {
    messageBoxContent?: MessageBoxContent;
}

export class Sic1Root extends React.Component<{}, Sic1RootState> {
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

    private static readonly promotionMessages: ((data: UserData) => React.ReactFragment)[] = [
        data => <><p>Congratulations, {data.name}! In recognition of your contributions to SIC Systems, you have been promoted to {Sic1Root.getJobTitle(data)}.</p></>,

        // Engineer
        data => <><p>Thanks for completing your introductory training assignments, {data.name}! Your starting job title is: {Sic1Root.getJobTitle(data)}.</p><p>Please get started
            on your assignments right away.</p></>,

        // Engineer II
        data => <><p>Nice work on the arithmetic programs, {data.name}! As of this email, you have been promoted to {Sic1Root.getJobTitle(data)}.</p><p>Please continue your work.
            We expect great things from you!</p></>,

        // Senior Engineer
        data => <><p>Impressive work, {data.name}! Based on your stellar performance, I'm promoting you to {Sic1Root.getJobTitle(data)}.</p><p>Your next couple of assignments are
            very important (and difficult), so please get started as soon as you can. Thanks for taking the time to prioritize this work over competing priorities in your personal
            life!</p></>,

        // Principal Engineer
        data => <><p>Spectacular work, {data.name}! Based on your innovative solutions, you are being promoted to {Sic1Root.getJobTitle(data)}.</p><p>Your new assignments are on
            the bleeding edge of SIC Systems research. Welcome to the exciting world of natural language processing! As always, we greatly appreciate your willingness to work
            night and day to make SIC Systems profitable! Even though it's getting late, if you could continue your work, that would be super helpful. Thanks!</p></>,

        // Partner Engineer
        data => <><p>Incredible work, {data.name}! After consulting with the SIC Systems board, I've been given special permission to promote you to {Sic1Root.getJobTitle(data)}.
            </p><p>You've shown tenacity to get this far, and you'll need loads of it for the next batch of tasks. We need to give the SIC-1 the ability to understand its own
            code, in order to unleash its immense computing power on optimizing its own performance. We'll be happy to provide on-site food and laundry service, home
            cleaning/maintenance, child care, and anti-aging services to you as part of your compensation package. We just need you to push through this one last sprint to
            the finish line. Your fellow SIC Systems family members thank you for your perseverance!</p></>,

        // Technical Fellow Emeritus
        data => <><p>Truly amazing work, {data.name}! The SIC Systems board unanimously voted to create a new title just for you: {Sic1Root.getJobTitle(data)}.</p><p>Thank you
            from the bottom of my heart for all of the sacrifices you've made to get us to this point. The SIC-1 is now able to create and reason about its own code. This is an
            amazing breakthrough and you should be very proud.</p><p>Now that we've reached this exciting milestone (thanks to your tireless efforts!), SIC Systems really can't
            challenge someone of your vast talents. You can now begin the next phase of your career at one of the many other technology companies around the world. I know
            parting ways is tough, but SIC Systems is a business, not a family, so we have to say goodbye to employees once they're no longer needed. Thanks one last time,
            and best of luck to you!</p></>,
    ];

    private ide = React.createRef<Sic1Ide>();
    private userProfileForm = React.createRef<Sic1UserProfileForm>();

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
        return {
            puzzle,
            defaultCode: Sic1Root.getDefaultCode(puzzle),
        };
    }

    private static getJobTitle(data: UserData): string {
        let title = "";
        for (const row of Sic1Root.jobTitles) {
            if (data.solvedCount >= row.minimumSolved) {
                title = row.title;
            }
        }
        return title;
    }

    private static getPromotionMessage(data: UserData): React.ReactFragment {
        let message: React.ReactFragment = <><p>Congratulations, {data.name}! In recognition of your contributions to SIC Systems, you have been promoted to {Sic1Root.getJobTitle(data)}.</p></>;
        for (let i = 0; i < Sic1Root.jobTitles.length; i++) {
            const row = Sic1Root.jobTitles[i];
            if (data.solvedCount >= row.minimumSolved) {
                message = Sic1Root.promotionMessages[i](data);
            }
        }
        return message;
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
        this.closeMessageBox();
    }

    private puzzleCompleted(cycles: number, bytes: number, programBytes: number[]): void {
        // Mark as solved in persistent state
        const puzzle = this.state.puzzle;
        const puzzleData = Sic1DataManager.getPuzzleData(puzzle.title);
        let jobTitleChanged = false;
        if (!puzzleData.solved) {
            const data = Sic1DataManager.getData();
            const previousJobTitle = Sic1Root.getJobTitle(data);
            data.solvedCount++;
            const newJobTitle = Sic1Root.getJobTitle(data);
            if (newJobTitle !== previousJobTitle) {
                jobTitleChanged = true;
            }

            puzzleData.solved = true;
            puzzleData.solutionCycles = cycles;
            puzzleData.solutionBytes = bytes;

            Sic1DataManager.saveData();
            Sic1DataManager.savePuzzleData(puzzle.title);
        } else if (cycles < puzzleData.solutionCycles) {
            // Update stats if number of cycles has improved (service also tracks best memory result, but the client
            // only tracks cycles for simplicity)

            puzzleData.solutionCycles = cycles;
            puzzleData.solutionBytes = bytes;
            Sic1DataManager.savePuzzleData(puzzle.title);
        }

        this.showSuccessMessageBox(cycles, bytes, programBytes, jobTitleChanged);
    }

    private keyUpHandler = (event: KeyboardEvent) => {
        if (event.keyCode === 27) { // Escape key
            if (this.state.messageBoxContent) {
                this.closeMessageBox();
            } else if (this.ide.current && this.ide.current.isExecuting()) {
                this.ide.current.pause();
            } else if (this.ide.current && this.ide.current.hasStarted()) {
                this.ide.current.stop();
            } else {
                this.showPuzzleList();
            }
        }
    }

    private showEmail(subject: string, body: React.ReactFragment, from?: string): void {
        const data = Sic1DataManager.getData();
        this.showMessageBox({
            title: "New Email",
            body: <>
                TO: {data.name} ({Sic1Root.getJobTitle(data)})<br />
                FROM: {from ? from : "Jerin Kransky (Director of Engineering)"}<br />
                DATE: {(new Date()).toLocaleString()}<br />
                SUBJECT: {subject}<br />
                {body}
            </>,
        });
    }

    private showIntro2(name: string) {
        this.showEmail("Welcome to the team!", <>
            <p>Congratulations, {name}! SIC Systems has accepted your application. Introductory information and your first assignment are below.</p>
            <p>Introducing the SIC-1</p>
            <p>The SIC-1 represents a transformational change in computing, reducing complexity to the point that the processor only executes a single instruction: subtract and branch if less than or equal to zero ("subleq").</p>
            <p>Note that you can view the program inventory by clicking the "Menu" button or hitting ESC.</p>
            <p>Click the following link:</p>
            <p>&gt; <TextButton text="Get started with your first SIC-1 program" onClick={() => {
                const data = Sic1DataManager.getData();
                data.introCompleted = true;
                Sic1DataManager.saveData();

                this.loadPuzzle(puzzles[0].list[0]);
                this.closeMessageBox();
            }} />.</p>
        </>);
    }

    private updateUserProfile(name: string, uploadName: boolean, callback: () => void) {
        const data = Sic1DataManager.getData();
        data.name = name;
        data.uploadName = uploadName;
        Sic1DataManager.saveData();

        // No need to wait for completion
        Sic1Service.updateUserProfile(data.userId, uploadName ? name : "");

        callback();
    }

    private showIntro() {
        this.showMessageBox({
            title: "Welcome!",
            body: <>
                <h1>Welcome to SIC Systems!</h1>
                <h2>Job Description</h2>
                <p>SIC Systems is looking for programmers to produce highly efficient programs for their flagship product: the Single Instruction Computer Mark 1 (SIC-1).</p>
                <p>Note that you will be competing against other engineers to produce the fastest and smallest programs.</p>
                <h2>Job Application</h2>
                <p><Sic1UserProfileForm ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.showIntro2(name))} /></p>
                <h2>Instructions</h2>
                <p>After completing the form above, click the following link to submit your job application:</p>
                <p>&gt; <TextButton text="Apply for the job" onClick={() => this.userProfileForm.current.submit()} /></p>
            </>
        });
    }

    private getUserStatsFragment(): React.ReactFragment {
        return <>
            <p>For motivational purposes, here is how the number of tasks you have completed compares to other engineers.</p>
            <div className="charts">
                <Chart title="Completed Tasks" promise={Sic1Service.getUserStats(Sic1DataManager.getData().userId)} />
            </div>
        </>;
    }

    private showEditUserProfile(): void {
        this.showMessageBox({
            title: "User Profile",
            body: <>
                <p>Update your user profile as needed:</p>
                <p><Sic1UserProfileForm ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.closeMessageBox())} /></p>
                <p>
                    &gt; <TextButton text="Save changes" onClick={() => this.userProfileForm.current.submit()} />
                    <br />&gt; <TextButton text="Cancel" onClick={() => this.closeMessageBox()} />
                </p>
            </>,
        });
    }

    private showUserProfile(): void {
        // TODO: Consider including a computed rank in addition to the user stats chart
        const data = Sic1DataManager.getData();
        this.showMessageBox({
            title: "User Profile",
            body: <>
                User: {data.name} ({Sic1Root.getJobTitle(data)})<br />
                {this.getUserStatsFragment()}
            </>,
        });
    }

    private showMenu(): void {
        this.showMessageBox({
            title: "Main Menu",
            body: <>
                <p>Select one of the following options:</p>
                <ul>
                    <li><TextButton text="View Program Inventory" onClick={() => this.showPuzzleList()} /></li>
                </ul>
                <ul>
                    <li><TextButton text="View User Profile" onClick={() => this.showUserProfile()} /></li>
                    <li><TextButton text="Edit User Profile" onClick={() => this.showEditUserProfile()} /></li>
                </ul>
            </>,
        });
    }

    private showResume() {
        this.showEmail("Welcome back!", <>
            <p>Welcome back, {Sic1DataManager.getData().name}. SIC Systems appreciates your continued effort.</p>
            {this.getUserStatsFragment()}
            <p>Click the following link:</p>
            <p>&gt; <TextButton text="Go to the program inventory" onClick={() => {
                this.showPuzzleList();
            }} />.</p>
        </>, "SIC Systems Personalized Greeting")
    }

    private showSuccessMessageBox(cycles: number, bytes: number, programBytes: number[], promoted: boolean): void {
        const promise = Sic1Service.getPuzzleStats(this.state.puzzle.title, cycles, bytes);

        // Upload after getting stats (regardless of error or not)
        // TODO: Only upload if better result?
        const uploadResult = () => Sic1Service.uploadSolution(Sic1DataManager.getData().userId, this.state.puzzle.title, cycles, bytes, programBytes);
        promise
            .then(uploadResult)
            .catch(uploadResult);

        this.showEmail(promoted ? "Promotion" : "Well done!", <>
            {
                promoted
                ? Sic1Root.getPromotionMessage(Sic1DataManager.getData())
                : <p>Your program produced the correct output. Thanks for your contribution to SIC Systems!</p>
            }

            <p>Here are performance statistics of your program (as compared to others' programs):</p>
            <div className="charts">
                <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
                <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
            </div>
            <p>Click this link:</p>
            <p>&gt; <TextButton text="Go to the program inventory" onClick={() => this.showPuzzleList()} />.</p>
        </>, promoted ? null : "SIC-1 Automated Task Management");
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
            <TextButton text={puzzle.title} onClick={() => this.loadPuzzle(puzzle)} />
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

        const data = Sic1DataManager.getData();
        this.showMessageBox({
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
        });
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
                defaultCode={this.state.defaultCode}

                onCompilationError={(error) => this.showCompilationError(error)}
                onMenuRequested={() => this.showMenu()}
                onPuzzleCompleted={(cycles, bytes, programBytes) => this.puzzleCompleted(cycles, bytes, programBytes)}
                onSaveRequested={() => this.saveProgress()}
                />
            {
                messageBoxContent
                ? <MessageBox
                    title={messageBoxContent.title}
                    body={messageBoxContent.body}
                    onDismissed={() => this.closeMessageBox()}
                    />
                : null
            }
        </>;
    }
}
