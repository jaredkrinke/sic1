import { Assembler, Command, CompilationError } from "../../../lib/src/sic1asm";
import { puzzleCount } from "../../shared/puzzles";
import { Platform } from "./platform";
import { menuBehavior, MessageBox, MessageBoxContent } from "./message-box";
import { Shared } from "./shared";
import { TextButton } from "./text-button";
import { Sic1DataManager } from "./data-manager";
import { Sic1WebService, StatChanges } from "./service";
import { Sic1Ide } from "./ide";
import { addMailForPuzzle, ensureSolutionStatsMailUnread, hasUnreadMail, migrateInbox, updateSessionStats } from "./mail";
import { MailViewer } from "./mail-viewer";
import licenses from "./licenses";
import React from "react";
import { PuzzleList, PuzzleListTypes } from "./puzzle-list";
import { Music, SongId } from "./music";
import { SoundEffects } from "./sound-effects";
import { Button } from "./button";
import { Achievement, achievements, jobTitleAchievementIds } from "./achievements";
import { AvoisionUI } from "./avoision-ui";
import { Toaster } from "./toaster";
import { loadImageAsync } from "./image-cache";
import packageJson from "../package.json";
import { ColorScheme, colorSchemeNames } from "./colors";
import { ClientPuzzle, ClientPuzzleGroup, initializePuzzles, puzzleSandbox } from "./puzzles";
import { CopyToClipboardButton } from "./button-clipboard";
import { ButtonWithResult } from "./button-result";
import { FormattedMessage, IntlShape } from "react-intl";

function Link(props: { title: string, link: string }) {
    const { title, link } = props;
    return <a href={link} target="_blank">{title}</a>;
}

interface Sic1UserProfileFormProps {
    intl: IntlShape;
    onCompleted: (name: string, uploadName: boolean) => void;
}

class Sic1UserProfileForm extends React.Component<Sic1UserProfileFormProps> {
    private inputName = React.createRef<HTMLInputElement>();
    private inputUploadName = React.createRef<HTMLInputElement>();

    public submit() {
        this.props.onCompleted(this.inputName.current.value, this.inputUploadName.current.checked);
    }

    public render(): React.ReactNode {
        const data = Sic1DataManager.getData();

        return <form onSubmit={(event) => {
                event.preventDefault();
                this.submit();
            }}>
                <label><FormattedMessage
                    id="introLabelName"
                    description="Label for user name on the introductory form"
                    defaultMessage="Name:"/> <input
                    ref={this.inputName}
                    autoFocus={true}
                    maxLength={Sic1WebService.userNameMaxLength}
                    defaultValue={data.name || this.props.intl.formatMessage({
                        id: "defaultName",
                        description: "Default user name (only used in web version)",
                        defaultMessage: "Bill",
                    })}
                    /></label>
                <p><label><input
                    ref={this.inputUploadName} type="checkbox"
                    defaultChecked={(typeof(data.uploadName) === "boolean") ? data.uploadName : true}
                    /> <FormattedMessage
                        id="checkboxShareName"
                        description="Explanatory text for checkbox that opts into showing the player's name in public leaderboards"
                        defaultMessage="Show my name in public leaderboards (if unchecked, your statistics will be shown without a name)"/></label></p>
            </form>;
    }
}

const importSaveDataButtonText = <FormattedMessage
    id="buttonSaveDataImport"
    description="Text shown on the 'import save data' button"
    defaultMessage="Import Save Data"
    />;

class Sic1SaveDataImportForm extends React.Component<{ onImport: (compressed: string) => void }> {
    private input = React.createRef<HTMLTextAreaElement>();

    public render(): React.ReactNode {
        return <>
            <p>
                <FormattedMessage
                    id="textSaveDataImport"
                    description="Instructional text shown in the 'import save data' window"
                    defaultMessage="Paste in your previously exported save data string here:"
                    />
            </p>
            <textarea ref={this.input} className="saveData"></textarea>
            <Button onClick={() => this.props.onImport(this.input.current?.value)}>{importSaveDataButtonText}</Button>
        </>;
    }
}

interface ZoomSliderProps {
    zoom: number;
    onZoomUpdated: (zoom: number) => void;
}

class ZoomSlider extends React.Component<ZoomSliderProps> {
    constructor(props) {
        super(props);
    }

    public render(): React.ReactNode {
        return <label>
            <FormattedMessage
                id="sliderZoom"
                description="Label for the text size slider"
                defaultMessage="Zoom:"
                />
            &nbsp;
            <input
                type="range"
                min={0.6}
                max={2}
                step={0.2}
                defaultValue={`${this.props.zoom}`}
                onChange={(event) => this.props.onZoomUpdated(parseFloat(event.currentTarget.value))}
                />
        </label>;
    }
}

interface Sic1CheckboxInstanceProps {
    intl: IntlShape;
    position: "left" | "right";
    value: boolean;
    onUpdated: (value: boolean) => void;
}

type Sic1CheckboxProps = Sic1CheckboxInstanceProps & {
    labelAfter: string;
    labelBefore: string;
}

class Sic1Checkbox extends React.Component<Sic1CheckboxProps> {
    public render(): React.ReactNode {
        const checkbox = <input
            className={this.props.position}
            type="checkbox"
            onChange={(event) => this.props.onUpdated(event.currentTarget.checked)}
            defaultChecked={this.props.value}
            />;

        if (this.props.position === "left") {
            return <label>{checkbox} {this.props.labelAfter}</label>;
        } else {
            return <label>{this.props.labelBefore}: {checkbox}</label>;
        }
    }
}

class Sic1SoundCheckbox extends React.Component<Sic1CheckboxInstanceProps> {
    public render(): React.ReactNode {
        const { intl } = this.props;
        return <Sic1Checkbox
            labelBefore={intl.formatMessage({
                id: "checkboxSoundEffectsBefore",
                description: "Label for sound effects checkbox, when appearing before the checkbox",
                defaultMessage: "Sound effects",
            })}
            labelAfter={intl.formatMessage({
                id: "checkboxSoundEffectsAfter",
                description: "Label for the sound effects checkbox, when appearing after the checkbox",
                defaultMessage: "Enable sound effects",
             })} {...this.props} />;
    }
}

class Sic1MusicCheckbox extends React.Component<Sic1CheckboxInstanceProps> {
    public render(): React.ReactNode {
        const { intl } = this.props;
        return <Sic1Checkbox
            labelBefore={intl.formatMessage({
                id: "checkboxMusicBefore",
                description: "Label for music checkbox, when appearing before the checkbox",
                defaultMessage: "Music",
            })}
            labelAfter={intl.formatMessage({
                id: "checkboxMusicAfter",
                description: "Label for the music checkbox, when appearing after the checkbox",
                defaultMessage: "Enable music",
            })} {...this.props} />;
    }
}

interface Sic1PresentationSettingsProps {
    intl: IntlShape;

    fullscreen: boolean;
    onFullscreenUpdated: (fullscreen: boolean) => void;
    zoom: number;
    onZoomUpdated: (zoom: number) => void;
    colorScheme: ColorScheme;
    onColorSchemeUpdated: (colorScheme: ColorScheme) => void;

    soundEffects: boolean;
    onSoundEffectsUpdated: (soundEffects: boolean) => void;
    soundVolume: number;
    onSoundVolumeUpdated: (volume: number) => void;

    music: boolean;
    onMusicUpdated: (music: boolean) => void;
    musicVolume: number;
    onMusicVolumeUpdated: (volume: number) => void;
}

class Sic1PresentationSettings extends React.Component<Sic1PresentationSettingsProps> {
    public render(): React.ReactNode {
        const { intl } = this.props;
        return <>
            <form onSubmit={(event) => event.preventDefault()}>
                <label>
                    <FormattedMessage
                        id="checkboxFullscreen"
                        description="Label for the 'fullscreen' checkbox toggle"
                        defaultMessage="Fullscreen:"
                        />
                    &nbsp;
                    <input
                    className="right"
                    type="checkbox"
                    defaultChecked={this.props.fullscreen && Platform.fullscreen.get()}
                    onChange={(event) => this.props.onFullscreenUpdated(event.currentTarget.checked) }
                    /></label>
                <ZoomSlider
                    zoom={this.props.zoom}
                    onZoomUpdated={this.props.onZoomUpdated}
                    />
                <label>
                    <FormattedMessage
                        id="selectColorScheme"
                        description="Label for the 'color scheme' dropdown menu"
                        defaultMessage="Color scheme:"
                        />
                    &nbsp;
                    <select onChange={(event) => this.props.onColorSchemeUpdated(event.currentTarget.value as ColorScheme)}>
                        {colorSchemeNames.map(name => <option value={name} selected={name === this.props.colorScheme}>{(() => {
                            switch (name) {
                                case "White on Black":
                                    return <FormattedMessage
                                        id="colorSchemeWhite on Black"
                                        description="Display name for the 'White on Black' color scheme"
                                        defaultMessage="White on Black"
                                        />;

                                case "Black on White":
                                    return <FormattedMessage
                                        id="colorSchemeBlack on White"
                                        description="Display name for the 'Black on White' color scheme"
                                        defaultMessage="Black on White"
                                        />;

                                case "Green Phosphor":
                                    return <FormattedMessage
                                        id="colorSchemeGreen Phosphor"
                                        description="Display name for the 'Green Phosphor' color scheme"
                                        defaultMessage="Green Phosphor"
                                        />;

                                case "Amber Phosphor":
                                    return <FormattedMessage
                                        id="colorSchemeAmber Phosphor"
                                        description="Display name for the 'Amber Phosphor' color scheme"
                                        defaultMessage="Amber Phosphor"
                                        />;

                                default:
                                    return <FormattedMessage
                                        id="colorSchemeDefault"
                                        description="Display name for the 'Default' color scheme"
                                        defaultMessage="Default"
                                        />;
                            }
                        })()}</option>)}
                    </select>
                </label>
                <br/>
                <Sic1SoundCheckbox intl={intl} position="right" value={this.props.soundEffects} onUpdated={this.props.onSoundEffectsUpdated} />
                <label>
                    <FormattedMessage
                        id="sliderSoundVolume"
                        description="Label for the 'sound effects volume' slider"
                        defaultMessage="Sound effects volume:"
                        />
                    &nbsp;
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        disabled={false}
                        defaultValue={`${this.props.soundVolume}`}
                        onChange={(event) => { this.props.onSoundVolumeUpdated(parseFloat(event.currentTarget.value)) } }
                        />
                </label>
                <br/>
                <Sic1MusicCheckbox intl={intl} position="right" value={this.props.music} onUpdated={this.props.onMusicUpdated} />
                <label><FormattedMessage
                        id="sliderMusicVolume"
                        description="Label for the 'music volume' slider"
                        defaultMessage="Music volume:"
                        />
                    &nbsp;
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        disabled={false}
                        defaultValue={`${this.props.musicVolume}`}
                        onChange={(event) => { this.props.onMusicVolumeUpdated(parseFloat(event.currentTarget.value)) } }
                        />
                </label>
            </form>
        </>;
    }
}

interface Sic1RootProps extends Sic1PresentationSettingsProps {
    intl: IntlShape;
    onRestart: () => void;
}

interface Sic1RootPuzzleState {
    puzzle: ClientPuzzle;
    solutionName: string;
    defaultCode: string;
}

interface Sic1RootState extends Sic1RootPuzzleState {
    messageBoxQueue: MessageBoxContent[];
    previousFocus?: Element;
    clientPuzzlesGrouped: ClientPuzzleGroup[];
    puzzleFlatArray: ClientPuzzle[];
    clientPuzzles: ClientPuzzle[];
    titleToClientPuzzle: { [title: string]: ClientPuzzle };
}

export class Sic1Root extends React.Component<Sic1RootProps, Sic1RootState> {
    private static readonly manualMailId = "s0_0";
    private static readonly devEnvMailId = "s0_1";
    private readonly warningPeriodMS = 1000;

    private ide = React.createRef<Sic1Ide>();
    private toaster = React.createRef<Toaster>();
    private userProfileForm = React.createRef<Sic1UserProfileForm>();
    private mailViewer = React.createRef<MailViewer>();
    private achievements: { [achievement: string]: boolean } = {};

    constructor(props) {
        super(props);

        // User data migration
        migrateInbox();

        // Load previous puzzle, if available
        const { clientPuzzlesGrouped, puzzleFlatArray, clientPuzzles, titleToClientPuzzle } = initializePuzzles(this.props.intl);
        const previousPuzzleTitle = Sic1DataManager.getData().currentPuzzle;
        const puzzle = clientPuzzles.find(p => p.title === previousPuzzleTitle) ?? clientPuzzles[0];
        const { currentSolutionName } = Sic1DataManager.getPuzzleData(puzzle.title);
        const { solution } = Sic1DataManager.getPuzzleDataAndSolution(puzzle.title, currentSolutionName, true);
        const { defaultCode } = Sic1Root.getStateForPuzzle(puzzle, solution.name);

        this.state = {
            clientPuzzlesGrouped,
            puzzleFlatArray,
            clientPuzzles,
            titleToClientPuzzle,
            puzzle,
            solutionName: solution.name,
            defaultCode,
            messageBoxQueue: [],
        }
    }

    private static wrapComments(code: string): string {
        const maxLineLength = 68;
        const lines = code.split("\n");
        const result: string[] = [];
        const addCommentPrefix = (s: string) => `; ${s}`;
        for (const line of lines) {
            if (line.startsWith("; ") && line.charAt(2) !== " ") {
                let l = line.replace(/^;[ ]*/, "");
                while (true) {
                    if (l.length <= maxLineLength) {
                        result.push(addCommentPrefix(l));
                        break;
                    }
    
                    const end = l.lastIndexOf(" ", maxLineLength - 1);
                    if (end < 0) {
                        result.push(addCommentPrefix(l));
                        break;
                    }
    
                    result.push(addCommentPrefix(l.substring(0, end)));
                    l = l.substring(end + 1);
                }
            } else {
                result.push(line);
            }
        }
        return result.join("\n");
    }

    private static getUnmodifiedCode(puzzle: ClientPuzzle) {
        const prewrappedCode = puzzle.code || `; ${puzzle.description}\n`;
        return Sic1Root.wrapComments(prewrappedCode);
    }

    private static getDefaultCode(puzzle: ClientPuzzle, solutionName: string) {
        // Load progress (or fallback to default)
        const { solution } = Sic1DataManager.getPuzzleDataAndSolution(puzzle.title, solutionName, false);
        let code = solution?.code;
        if (code === undefined || code === null) {
            code = Sic1Root.getUnmodifiedCode(puzzle);
        }
        return code;
    }

    private static getStateForPuzzle(puzzle: ClientPuzzle, solutionName: string): Sic1RootPuzzleState {
        return {
            puzzle,
            solutionName,
            defaultCode: Sic1Root.getDefaultCode(puzzle, solutionName),
        };
    }

    private playSoundCorrect = Shared.createFunctionWithMinimumPeriod(() => SoundEffects.play("correct"), 50);

    private playSoundIncorrect(): void {
        SoundEffects.stop("correct");
        SoundEffects.play("incorrect");
    }

    private playSoundCompleted(): void {
        SoundEffects.stop("correct");
        SoundEffects.play("completed");
    }

    private saveProgress(): void {
        if (this.ide.current) {
            const { puzzle, solutionName } = this.state;
            let code = this.ide.current.getCode();
            if (code === Sic1Root.getUnmodifiedCode(puzzle)) {
                code = null;
            }

            const { solution } = Sic1DataManager.getPuzzleDataAndSolution(puzzle.title, solutionName, false);
            if (solution && (solution.code !== code)) {
                solution.code = code;

                // Also invalidate metrics
                solution.solutionCycles = undefined;
                solution.solutionBytes = undefined;

                Sic1DataManager.savePuzzleData(puzzle.title);
            }
        }
    }

    private loadPuzzle(puzzle: ClientPuzzle, solutionName: string): void {
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
        let puzzleDataModified = false;
        if (!puzzleData.viewed) {
            puzzleData.viewed = true;
            puzzleDataModified = true;
        }

        // Mark as last open solution for this puzzle
        if (puzzleData.currentSolutionName !== solutionName) {
            puzzleData.currentSolutionName = solutionName;
            puzzleDataModified = true;
        }

        if (puzzleDataModified) {
            Sic1DataManager.savePuzzleData(puzzle.title);
        }

        this.setState(Sic1Root.getStateForPuzzle(puzzle, solutionName));
        if (this.ide.current) {
            this.ide.current.reset(puzzle, solutionName);
        }

        this.messageBoxClear();
    }

    private recordAchievement(achievement: Achievement): void {
        // Note: This is not persisted and is only for this session
        const achievements = this.achievements;
        if (achievements[achievement] !== true) {
            achievements[achievement] = true;
        }
    }

    private async showAchievementNotificationAsync(achievement: Achievement): Promise<void> {
        const achievementInfo = achievements[achievement];
        const image = await loadImageAsync(achievementInfo.imageUri, 64, 64);
        if (this.toaster.current) {
            this.toaster.current.enqueue({
                image,
                title: <FormattedMessage
                    id="achievementPopUpTitle"
                    description="Title of the 'achievement unlocked' pop-up message"
                    defaultMessage="Achievement Unlocked"
                    />,
                text: achievementInfo.title,
            });
        }
    }

    private ensureAchievement(achievement: Achievement): void {
        if (this.achievements[achievement] === true) {
            return;
        }

        Platform.setAchievementAsync(achievement).then(newlyAchieved => {
            this.recordAchievement(achievement);

            if (newlyAchieved && Platform.shouldShowAchievementNotification?.()) {
                this.showAchievementNotificationAsync(achievement);
            }
        });
    }

    private ensureJobTitleAchievements(): void {
        const data = Sic1DataManager.getData();
        for (let i = 1; i < Shared.jobTitles.length && (i - 1) < jobTitleAchievementIds.length; i++) {
            const job = Shared.jobTitles[i];
            if (job.minimumSolved <= data.solvedCount) {
                this.ensureAchievement(jobTitleAchievementIds[i - 1]);
            } else {
                break;
            }
        }

        // Check for new ending achievement
        if (data.solvedCount >= puzzleCount) {
            this.ensureAchievement("NEW_END");
        }
    }

    private checkForSolutionAchievements(): void {
        // Ensure job title-associated achievements are set
        this.ensureJobTitleAchievements();

        // Check for time-based achievements
        const now = new Date();
        if (now.getHours() < 6) {
            this.ensureAchievement("TIME_EARLY");
        } else if (now.getHours() >= 21) {
            this.ensureAchievement("TIME_LATE");
        }

        // Check for "no subleq" achievement
        if (this.state.puzzle.title === "Addition") {
            const noSubleq = this.ide.current.getCode()
                .split("\n")
                .map(line => Assembler.parseLine(line).command)
                .every(command => (command !== Command.subleqInstruction));

            if (noSubleq) {
                this.ensureAchievement("OMIT_SUBLEQ");
            }
        }
    }

    private puzzleCompleted(cycles: number, bytes: number, programBytes: number[]): void {
        // Mark as solved in persistent state
        const { puzzle, solutionName } = this.state;
        const { puzzleData, solution } = Sic1DataManager.getPuzzleDataAndSolution(puzzle.title, solutionName, false);
        const data = Sic1DataManager.getData();
        const solvedCountOld = data.solvedCount;
        const cyclesOld = puzzleData.solutionCycles;
        const bytesOld = puzzleData.solutionBytes;

        let puzzleDataModified = false;
        if (!puzzleData.solved) {
            data.solvedCount = Math.min(puzzleCount, data.solvedCount + 1);

            puzzleData.solved = true;
            puzzleData.solutionCycles = cycles;
            puzzleData.solutionBytes = bytes;

            Sic1DataManager.saveData();
            puzzleDataModified = true;
        } else if (cycles < puzzleData.solutionCycles || bytes < puzzleData.solutionBytes) {
            puzzleData.solutionCycles = Math.min(puzzleData.solutionCycles, cycles);
            puzzleData.solutionBytes = Math.min(puzzleData.solutionBytes, bytes);
            puzzleDataModified = true;
        }

        if (solution && ((cycles !== solution.solutionCycles) || (bytes !== solution.solutionBytes))) {
            solution.solutionCycles = cycles;
            solution.solutionBytes = bytes;
            puzzleDataModified = true;
        }

        if (puzzleDataModified) {
            Sic1DataManager.savePuzzleData(puzzle.title);
        }

        // Prepare a list of potential changes
        const statChanges: StatChanges = {
            solvedCount: {
                improved: (solvedCountOld === undefined) || (data.solvedCount > solvedCountOld),
                oldScore: solvedCountOld,
                newScore: data.solvedCount,
            },
            cycles: {
                improved: (cyclesOld === undefined) || (cycles < cyclesOld),
                oldScore: cyclesOld,
                newScore: cycles,
            },
            bytes: {
                improved: (bytesOld === undefined) || (bytes < bytesOld),
                oldScore: bytesOld,
                newScore: bytes,
            },
        }

        // Check for new mail
        addMailForPuzzle(puzzle.title);

        // Force the automated stats mail to be unread
        ensureSolutionStatsMailUnread(puzzle.title);

        // Start uploading solution/stats
        const leaderboardPromises = Platform.service.updateStatsIfNeededAsync(data.userId, puzzle.title, programBytes, statChanges);

        // Update session stats (and any leaderboard update+loading promises) so they'll be shown in the mail viewer
        updateSessionStats(puzzle.title, cycles, bytes, leaderboardPromises);

        this.messageBoxPush(this.createMessageMailViewer(puzzle.title));
        this.checkForSolutionAchievements();
    }

    /** Gets the title of the next unsolved puzzle, or null if all puzzles have been solved. "Next" meaning the current
     * puzzle if it's unsolved, otherwise the next higher one, wrapping around, if needed. */
    private getNextPuzzle(): ClientPuzzle | null {
        const solvedCount = Sic1DataManager.getData().solvedCount;
        const currentPuzzleTitle = this.state.puzzle.title;
        const { puzzleFlatArray, clientPuzzles } = this.state;
        const currentPuzzleIndex = Math.max(0, puzzleFlatArray.findIndex(p => p.title === currentPuzzleTitle));
        let index = currentPuzzleIndex;

        if (!Sic1DataManager.getPuzzleData(puzzleFlatArray[index].title).solved) {
            return this.state.puzzle;
        }

        do {
            index = (index + 1) % puzzleCount;
        } while (index !== currentPuzzleIndex && ((puzzleFlatArray[index].minimumSolvedToUnlock > solvedCount) || Sic1DataManager.getPuzzleData(puzzleFlatArray[index].title).solved));
        if (index !== currentPuzzleIndex) {
            return clientPuzzles[index];
        }

        return null;
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

    private beforeUnloadHandler = (event: BeforeUnloadEvent) => {
        this.saveProgress();
    };

    private keyDownHandler = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            if (this.state.messageBoxQueue.length > 0) {
                if (this.state.messageBoxQueue[0].modal !== true) {
                    this.messageBoxPop();
                }
            } else if (this.ide.current && this.ide.current.pauseOrStop()) {
                // Already handled
            } else {
                this.messageBoxPush(this.createMessageMenu());
            }
        }
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

    private openManualInGame(): void {
        this.messageBoxPush(this.createMessageMailViewer(Sic1Root.manualMailId));
    }

    private openDevManualInGame(): void {
        this.messageBoxPush(this.createMessageMailViewer(Sic1Root.devEnvMailId));
    }

    private openManualInNewWindow(clearMessageBox: boolean): void {
        if (clearMessageBox) {
            this.messageBoxClear();
        }
        Platform.openManual();
    }

    private createMessageIntro(): MessageBoxContent {
        const { intl } = this.props;
        const applyButtonText = <FormattedMessage
            id="introApplyButton"
            description="Button text for the 'apply' button in the introductory form"
            defaultMessage="Apply for the Job"/>;

        return {
            title: <FormattedMessage
                id="windowIntro"
                description="Window title for introduction ('job application') message box"
                defaultMessage="Job Application"
                />,
            modal: true,
            body: <>
                <FormattedMessage
                    id="intro"
                    description="HTML content shown in the introductory message box ('job application')"
                    defaultMessage="
                <h3>Job Description:</h3>
                <p>SIC Systems is looking for experienced programmers to join our team!</p>
                <p>As an engineer at SIC Systems, you'll produce highly efficient programs for our flagship product: the Single Instruction Computer Mark 1 (SIC-1). You will be competing against other engineers to produce the fastest and smallest programs.</p>
                <p>This is a full-time salaried role. The ideal candidate for this job will have a PhD and 15 - 20 years (or more) of industry experience, along with a relentless attention to detail and exemplary interpersonal skills. Scheduling flexibility is a plus, as we push toward our worldwide launch.</p>
                <h3>About SIC Systems:</h3>
                <p>SIC Systems is the world leader in single-instruction computing. Our mission is to simplify computation, and thus simplify the world. We are innovative, trustworthy, and ethical.</p>"/>
                {
                    Platform.disableUserNameUpload
                    ? <>
                        <p><FormattedMessage
                            id="introApplyLabel"
                            description="Label for the 'apply for the job' button on the introductory form"
                            defaultMessage="Click the button below to submit your job application:"/></p>
                        <br/><Button onClick={() => this.updateUserProfile("", undefined, () => this.messageBoxReplace(this.createMessageMailViewer()))}>{applyButtonText}</Button>
                    </>
                    : <>
                        <h3><FormattedMessage
                            id="introHeaderJobApplication"
                            description="Header text for the 'job application' form"
                            defaultMessage="Job Application:"/></h3>
                        <p><Sic1UserProfileForm intl={intl} ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.messageBoxReplace(this.createMessageMailViewer()))} /></p>
                        <p><Sic1SoundCheckbox intl={intl} position="left" value={this.props.soundEffects} onUpdated={this.props.onSoundEffectsUpdated} /></p>
                        <p><Sic1MusicCheckbox intl={intl} position="left" value={this.props.music} onUpdated={this.props.onMusicUpdated} /></p>
                        <p><FormattedMessage
                            id="introApplyInvitation"
                            description="Invitation to click the 'apply' button in the introductory form"
                            defaultMessage="After completing the form above, click the button below to submit your job application:"/></p>
                        <br/><Button onClick={() => this.userProfileForm.current.submit()}>{applyButtonText}</Button>
                        {
                            (navigator?.userAgent && (navigator.userAgent.indexOf("iPad") > 0 || navigator.userAgent.indexOf("iPhone") > 0 || navigator.userAgent.indexOf("Macintosh") > 0))
                                ? <p>* <strong>Note for iPad users</strong>, progress will <em>not</em> be saved if the "Prevent Cross-Site Tracking" option is enabled on Safari (the setting is enabled by default). Unfortunately, avoiding this problem would require hosting the game somewhere other than itch.io, and there are currently no plans to change hosts. Sorry for the inconvenience!</p>
                                : null
                        }
                    </>
                }
            </>
        };
    }

    private createMessageUserProfileEdit(): MessageBoxContent {
        const { intl } = this.props;
        const userId = Sic1DataManager.getData().userId;
        return {
            title: <FormattedMessage
                id="windowEditProfile"
                description="Window title for the user profile editing message box (only used on the web version)"
                defaultMessage="User Profile"
                />,
            body: <>
                <FormattedMessage
                    id="contentEditProfile"
                    description="Markup shown when editing the user profile (only used on the web version)"
                    defaultMessage={`<p>Update your user profile as needed:</p><p>{form}</p><p>Note: if you would like to have all of your leaderboard data deleted, send an email to {email} with "{userId}" (your randomly-generated user id) in the subject.</p>`}
                    values={{
                        form: <Sic1UserProfileForm intl={intl} ref={this.userProfileForm} onCompleted={(name, uploadName) => this.updateUserProfile(name, uploadName, () => this.messageBoxPop())} />,
                        email: <Link title="sic1data@schemescape.com" link={`mailto:sic1data@schemescape.com?subject=Delete_${userId}`}/>,
                        userId,
                    }}
                    />
                <br/>
                <Button onClick={() => this.userProfileForm.current.submit()}>{Shared.resources.saveChanges}</Button>
                <Button onClick={() => this.messageBoxPop()}>{Shared.resources.cancel}</Button>
            </>,
        };
    }

    private createMessageSaveDataImportConfirm(compressed: string): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowSaveOverwrite"
                description="Window title for the 'overwrite data when importing' confirmation message box (only used on web version)"
                defaultMessage="Overwrite Data?"
                />,
            body: <>
                <FormattedMessage
                    id="contentSaveOverwrite"
                    description="Markup shown as a warning when overwriting save data during an import (only used on web version)"
                    defaultMessage="<h3>WARNING</h3><p>This will overwrite ALL of your current save data with the imported save data!</p><p>Are you sure you want to overwrite any existing save data?</p>"
                    />
                <ButtonWithResult
                    onClickAsync={async () => {
                        await Sic1DataManager.overwriteDataAsync(compressed);
                        this.props.onRestart();
                    }}
                    successMessage=""
                    errorMessage={this.props.intl.formatMessage({
                        id: "textSaveImportFailed",
                        description: "Text shown when importing save data fails (only used on web version)",
                        defaultMessage: "Error: Failed to overwrite save data.",
                    })}
                    enableDelayMS={this.warningPeriodMS}
                    >
                        <FormattedMessage
                            id="buttonSaveOverwriteConfirm"
                            description="Text shown on the 'yes, overwrite save data' confirmation button when importing save data (only used on the web version)"
                            defaultMessage="Yes, Overwrite My Save Data"
                            />
                        </ButtonWithResult>
                <Button onClick={() => this.messageBoxPop()}>{Shared.resources.cancel}</Button>
            </>,
        };
    }

    private createMessageSaveDataImport(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowSaveImport"
                description="Title of the 'import save data' message box' (only used on the web version)"
                defaultMessage="Import Data"
                />,
            body: <Sic1SaveDataImportForm onImport={(compressed) => {
                if (compressed) {
                    this.messageBoxPush(this.createMessageSaveDataImportConfirm(compressed));
                }
            }}/>,
        };
    }

    private createMessageSaveDataExport(): MessageBoxContent {
        const str = Sic1DataManager.exportData();
        return {
            title: <FormattedMessage
                id="windowSaveExport"
                description="Title of the 'export save data' message box (only used on the web version)"
                defaultMessage="Export Data"
                />,
            body: <>
                <p>
                    <FormattedMessage
                        id="textSaveExport"
                        description="Text shown in the 'export save data' message box (only used in the web version)"
                        defaultMessage="Below is a compressed and encoded copy of your save data. You can later import this data to restore it."
                        />
                </p>
                <textarea readOnly={true} className="saveData">{str}</textarea>
                <CopyToClipboardButton intl={this.props.intl} text={str}/>
            </>,
        };
    }

    private createMessageSaveDataClearConfirm(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowSaveClearConfirm"
                description="Window title of the 'clear save data' confirmation message box (only used on the web version)"
                defaultMessage="Clear Data?"
                />,
            body: <>
                <FormattedMessage
                    id="contentSaveClearConfirm"
                    description="Markup shown in the 'clear save data' confirmation message box (only used on the web version)"
                    defaultMessage="<h3>WARNING</h3><p>This will delete ALL of your save data! All of your solutions, your user name, and achievements will be lost!</p><p>Are you sure you want to delete all of your data?</p>"
                    />
                <ButtonWithResult
                    onClickAsync={async () => {
                        await Sic1DataManager.clearAllDataAsync();
                        this.props.onRestart();
                    }}
                    successMessage=""
                    errorMessage={this.props.intl.formatMessage({
                        id: "textSaveClearFailed",
                        description: "Message shown when clearing save data fails (only used on the web version)",
                        defaultMessage: "Error: Failed to clear save data.",
                    })}
                    enableDelayMS={this.warningPeriodMS}
                    >
                        <FormattedMessage
                            id="buttonSaveClearConfirm"
                            description="Text shown on the 'delete save data' confirmation button (only used on the web version)"
                            defaultMessage="Yes, Delete My Save Data"
                            />
                    </ButtonWithResult>
                <Button onClick={() => this.messageBoxPop()}>
                    <FormattedMessage
                        id="buttonSaveClearCancel"
                        description="Text shown on the 'delete save data' cancellation button (only used on the web version)"
                        defaultMessage="No, Keep My Save Data"
                        />
                </Button>
            </>,
        };
    }

    private createMessageSaveDataClear(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowSaveClear"
                description="Window title for the 'clear data' initial message box (only used on the web version)"
                defaultMessage="Clear Data"
                />,
            body: <>
                <p>
                    <FormattedMessage
                        id="textSaveClear"
                        description="Text content shown in the initial 'clear save data' message box (only used on the web version)"
                        defaultMessage="Use the button below to delete your solutions, user name, and achievements:"
                        />
                </p>
                <Button onClick={() => this.messageBoxPush(this.createMessageSaveDataClearConfirm())}>
                    <FormattedMessage
                        id="buttonSaveClear"
                        description="Text shown on the initial 'clear save data' button (only used on the web version)"
                        defaultMessage="Clear Data"
                        />
                </Button>
                <Button onClick={() => this.messageBoxPop()}>{Shared.resources.cancel}</Button>
            </>,
        };
    }

    private createMessageSaveDataManage(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowSaveManage"
                description="Window title for the 'manage save data' message box (only used on the web version)"
                defaultMessage="Manage Save Data"
                />,
            behavior: menuBehavior,
            body: <>
                <Button onClick={() => this.messageBoxPush(this.createMessageSaveDataImport())}>
                    <FormattedMessage
                        id="buttonSaveImportMenu"
                        description="Text on the button to open the 'import save data' message box (only used on the web version)"
                        defaultMessage="Import Save Data"
                        />
                </Button>
                <Button onClick={() => this.messageBoxPush(this.createMessageSaveDataExport())}>
                    <FormattedMessage
                        id="buttonSaveExportMenu"
                        description="Text on the button to open the 'export save data' message box (only used on the web version)"
                        defaultMessage="Export Save Data"
                        />
                </Button>
                <Button onClick={() => this.messageBoxPush(this.createMessageSaveDataClear())}>
                    <FormattedMessage
                        id="buttonSaveClearMenu"
                        description="Text shown on the button to open the 'clear save data' message box (only used on the web version)"
                        defaultMessage="Clear Save Data"
                        />
                </Button>
                <br/>
                <Button onClick={() => this.messageBoxPop()}>{Shared.resources.cancel}</Button>
            </>,
        };
    }

    private createMessageOptions(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowOptions"
                description="Window title for the general 'options' message box"
                defaultMessage="Options"
                />,
            behavior: menuBehavior,
            body: <>
                <Button onClick={() => {
                    this.messageBoxClear();
                    this.messageBoxPush(this.createMessagePuzzleList("achievements"));
                }}>
                    <FormattedMessage
                        id="buttonAchievementsMenu"
                        description="Text shown on the button to open the achievements message box"
                        defaultMessage="Achievements"
                        />
                </Button>
                {Platform.disableUserNameUpload
                    ? null
                    : <Button onClick={() => this.messageBoxPush(this.createMessageUserProfileEdit())}>
                        <FormattedMessage
                            id="buttonUserSettingsMenu"
                            description="Text shown on the button to open the 'user settings' menu (only used on the web version)"
                            defaultMessage="User Settings"
                            />
                        </Button>}
                {Platform.allowImportExport
                    ? <Button onClick={() => this.messageBoxPush(this.createMessageSaveDataManage())}>
                        <FormattedMessage
                            id="buttonSaveMenu"
                            description="Text on the button to open the save data management menu (only used on the web version)"
                            defaultMessage="Manage Save Data"
                            />
                        </Button>
                    : null}
                <Button onClick={() => this.messageBoxPush(this.createMessagePresentationSettings())}>
                    <FormattedMessage
                        id="buttonPresentationSettings"
                        description="Text on the button to open the 'presentation settings' menu, for editing fullscreen, sound, etc."
                        defaultMessage="Presentation Settings"
                        />
                </Button>
                <br/>
                <Button onClick={() => this.messageBoxPush(this.createMessageCredits())}>
                    <FormattedMessage
                        id="buttonCredits"
                        description="Text shown on the button to open the credits message box"
                        defaultMessage="Credits"
                        />
                </Button>
            </>,
        };
    }

    private createMessageHint(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowHint"
                description="Window title for the 'hint' message box"
                defaultMessage="Hint"
                />,
            body: <>
                <p>
                    <FormattedMessage
                        id="textHint"
                        description="Text shown as a heading in the 'hint' message box"
                        defaultMessage="Hint for {task}:"
                        values={{ task: this.state.puzzle.title }}
                        />
                </p>
                <p>{this.state.puzzle.hint}</p>
            </>,
        };
    }

    private createMessageHelp(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowHelp"
                description="Window title for the 'help' menu, which provides access to hints, manuals, etc."
                defaultMessage="Help"
                />,
            behavior: menuBehavior,
            body: <>
                <Button onClick={() => this.messageBoxPush(this.createMessageHint())}>
                    <FormattedMessage
                        id="buttonHint"
                        description="Text on the button to show a hint for the current task"
                        defaultMessage="Show Hint"
                        />
                </Button>
                <br/>
                <Button onClick={() => this.openManualInGame()}>
                    <FormattedMessage
                        id="buttonManualAssembly"
                        description="Text on the button to open the SIC-1 Assembly manual"
                        defaultMessage="Open SIC-1 Assembly Manual"
                        />
                </Button>
                <Button onClick={() => this.openDevManualInGame()}>
                    <FormattedMessage
                        id="buttonManualDevEnv"
                        description="Text on the button to open the SIC-1 Development Environment manual"
                        defaultMessage="Open Dev. Environment Manual"
                        />
                </Button>
                <br/>
                <Button onClick={() => this.openManualInNewWindow(true)}>
                    <FormattedMessage
                        id="buttonManualNewWindow"
                        description="Text on the button to open the combined manual in a new window"
                        defaultMessage="Open Combined Manual in New Window"
                        />
                </Button>
            </>,
        };
    }

    private createMessageMenu(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowMenu"
                description="Window title for the main menu"
                defaultMessage="Main Menu"
                />,
            behavior: menuBehavior,
            body: <>
                <Button onClick={() => this.messageBoxReplace(this.createMessagePuzzleList("puzzle", this.state.puzzle.title))}>
                    <FormattedMessage
                        id="buttonMenuTaskViewer"
                        description="Text on the button to open the task viewer/program inventory"
                        defaultMessage="Program Inventory"
                        />
                </Button>
                <Button onClick={() => this.messageBoxReplace(this.createMessageMailViewer())}>
                    <FormattedMessage
                        id="buttonMenuMailViewer"
                        description="Text on the button to open the mail viewer (using an antiquated term, if possible)"
                        defaultMessage="Electronic Mail"
                        />
                </Button>
                {Sic1DataManager.getData().solvedCount >= puzzleSandbox.minimumSolvedToUnlock
                    ? <>
                        <br/>
                        <Button onClick={() => this.messageBoxReplace(this.createMessagePuzzleList("puzzle", puzzleSandbox.title))}>
                            <FormattedMessage
                                id="buttonSandboxMenu"
                                description="Text on the button that opens the task viewer to the Sandbox Mode page"
                                defaultMessage="Sandbox Mode"
                                />
                        </Button>
                        </>
                    : null}
                {Sic1DataManager.getData().solvedCount >= Shared.avoisionSolvedCountRequired
                    ? <Button onClick={() => this.messageBoxReplace(this.createMessagePuzzleList("avoision"))}>
                        <FormattedMessage
                            id="buttonAvoisionPage"
                            description="Text on the button that opens the task viewer to the Avoision page"
                            defaultMessage="Avoision"
                            />
                        </Button>
                    : null}
                <br/>
                <Button onClick={() => this.messageBoxPush(this.createMessageHelp())}>
                    <FormattedMessage
                            id="buttonHelpMenu"
                            description="Text on the button that opens the 'help' menu'"
                            defaultMessage="Help"
                            />
                </Button>
                <br/>
                <Button onClick={() => {this.messageBoxPush(this.createMessageOptions())}}>
                    <FormattedMessage
                            id="buttonOptionsMenu"
                            description="Text on the button that opens the options menu'"
                            defaultMessage="Options"
                            />
                </Button>
                {Platform.app
                    ? <>
                        <br/>
                        <Button onClick={() => window.close()}>
                        <FormattedMessage
                            id="buttonExit"
                            description="Text on the button that exits the game (only used on the app version)"
                            defaultMessage="Exit SIC-1"
                            />
                        </Button></>
                    : null}
            </>,
        };
    }

    private createMessagePresentationSettings(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTitlePresentationSettings"
                description="Window title for the 'presentation settings' message box, which allows toggling fullscreen, adjusting volume, etc."
                defaultMessage="Presentation"
                />,
            behavior: menuBehavior,
            body: <Sic1PresentationSettings {...this.props} />,
        };
    }

    private createMessageLicenses(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTitleLicenses"
                description="Window title for the 'third party licenses' message box, showing copyright notices, etc."
                defaultMessage="Licenses"
                />,
            width: "wide",
            body: <>
                <h2>
                    <FormattedMessage
                        id="textLicenses"
                        description="Text heading for the 'third party licenses' message box, showing copyright notices, etc."
                        defaultMessage="Third Party Licenses"
                        />
                </h2>
                <pre className="licenses">{licenses}</pre>
            </>,
        };
    }

    private createMessageCredits(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTitleCredits"
                description="Window title for the 'credits' message box"
                defaultMessage="Credits"
                />,
            body: <>
                <div className="version">v{packageJson.version}</div>
                <h3 className="logo">SIC-1</h3>
                <p className="creditSubtitle">by <Link title="Anti-Pattern Games" link="https://www.antipatterngames.com/"/></p>
                <p>Thanks for playing! Hopefully you enjoyed it (or at least learned something in the process).</p>
                <h3>Background</h3>
                <p>I originally made this game because I was interested in single-instruction programming languages and I thought that the zachlike genre (originated by <Link title="Zachtronics" link="https://www.zachtronics.com/"/>) would be a fun way to explore the concept.</p>
                <p>After seeing quite a few people charging up the leaderboards, I decided to add more puzzles and eventually turn this into a full-fledged game (including writing a narrative and some music--both things I hadn't really attempted before, as you can likely tell).</p>
                <h3>Indieware</h3>
                <p>Although I spent a ridiculous number of hours making this game, I decided to release it for free because it's more fun to have tons of scores on the leaderboards (and also because the target audience of people who like both esoteric programming languages <em>and</em> zachlikes is probably too small to be profitable).</p>
                <p>Having said that, this game is officially released as <strong>indieware</strong> (a term I just made up), meaning:</p>
                <p>If you enjoyed this game and are feeling generous, please take whatever amount of money you think would have been reasonable to pay for SIC-1 and go buy some other indie game you've been eyeing. I'm sure the authors will appreciate your support. Thanks!</p>
                <p>&mdash; Jared Krinke (2022)</p>
                <p className="creditFooter">
                    <FormattedMessage
                        id="textCreditsFooter"
                        description="Text at the bottom of the 'credits' message box, with instructions for viewing third party licenses"
                        defaultMessage="To view third party licenses, {link}."
                        values={{ link: <TextButton onClick={() => this.messageBoxPush(this.createMessageLicenses())}>
                                <FormattedMessage
                                    id="buttonLicenses"
                                    description="Text on the link to third party licenses"
                                    defaultMessage="click here"
                                    />
                            </TextButton>,
                        }}
                        />
                </p>
            </>,
        };
    }

    private createMessageMailViewer(initialMailId?: string): MessageBoxContent {
        const nextPuzzle = this.getNextPuzzle();
        return {
            title: <FormattedMessage
                id="windowMail"
                description="Window title for mail viewer message box"
                defaultMessage="Electronic Mail"
                />,
            width: "none",
            body: <MailViewer
                ref={this.mailViewer}
                mails={Sic1DataManager.getData().inbox ?? []}
                titleToClientPuzzle={this.state.titleToClientPuzzle}
                initialMailId={initialMailId}
                currentPuzzleTitle={this.state.puzzle.title}
                onClearMessageBoxRequested={() => this.messageBoxClear()}
                onPuzzleListRequested={(type: PuzzleListTypes, title?: string) => this.messageBoxReplace(this.createMessagePuzzleList(type, title))}
                onNextPuzzleRequested={nextPuzzle ? () => this.messageBoxReplace(this.createMessagePuzzleList("puzzle", nextPuzzle.title)) : null}
                onCreditsRequested={() => this.messageBoxPush(this.createMessageCredits())}
                onManualInGameRequested={() => this.mailViewer?.current?.selectMail?.(Sic1Root.manualMailId)}
                onManualInNewWindowRequested={() => this.openManualInNewWindow(false)}
                onMailRead={id => {}}
            />,
        };
    }

    private createMessageCompilationError(error: CompilationError): MessageBoxContent {
        const heading = <FormattedMessage
            id="headerCompilationError"
            description="Heading for 'compilation error' message box"
            defaultMessage="Compilation Error"
            />;

        return {
            title: heading,
            body: <>
                <h3>{heading}</h3>
                <p>{
                ((errorType) => {
                    switch (errorType) {
                        case "AddressLiteralRangeError":
                        case "AddressReferenceRangeError":
                            return <FormattedMessage
                            id="compilationErrorAddressRangeError"
                            description="Error message shown when the 'address range error' compilation error is encountered, indicating an address literal isn't within the valid range"
                            defaultMessage={`Invalid address argument: "{argument}" (must be an integer on the range [{rangeMin}, {rangeMax}])!`}
                            values={{
                                argument: error.context.text,
                                rangeMin: error.context.rangeMin,
                                rangeMax: error.context.rangeMax,
                            }}
                            />;

                        case "InvalidAddressExpressionError": return <FormattedMessage
                            id="compilationErrorInvalidAddressExpressionError"
                            description="Error message shown when the 'InvalidAddressExpressionError' compilation error is encountered, indicating an unexpected token was encountered where an address was expected"
                            defaultMessage={`Expected number literal or reference, but got: "{token}"!`}
                            values={{
                                token: error.context.text,
                            }}
                            />;

                        case "InvalidBreakpointError": return <FormattedMessage
                            id="compilationErrorInvalidBreakpointError"
                            description="Error message shown when the 'InvalidBreakpointError' compilation error is encountered, indicating a breakpoint was set somewhere other than a 'subleq' instruction"
                            defaultMessage="Breakpoints are only supported on subleq instructions!"
                            />;

                        case "InvalidCommandError": return <FormattedMessage
                            id="compilationErrorInvalidCommandError"
                            description="Error message shown when the 'InvalidCommandError' compilation error is encountered, indicating a command other than 'subleq' and '.data' was encountered"
                            defaultMessage={`Unknown command: "{command}" (valid commands are: "subleq" and ".data")!`}
                            values={{
                                command: error.context.text,
                            }}
                            />;

                        case "InvalidDataArgumentCountError": return <FormattedMessage
                            id="compilationErrorInvalidDataArgumentCountError"
                            description="Error message shown when the 'InvalidDataArgumentCountError' compilation error is encountered, indicating no arguments were supplied for a '.data' directive"
                            defaultMessage={`Invalid number of arguments for ".data": {count} (must have at least 1 argument)!`}
                            values={{
                                count: error.context.number,
                            }}
                            />;

                        case "InvalidEscapeCodeError": return <FormattedMessage
                            id="compilationErrorInvalidEscapeCodeError"
                            description="Error message shown when the 'InvalidEscapeCodeError' compilation error is encountered, indicating a character escape code was not valid, likely indicating an errant backslash"
                            defaultMessage={`Invalid escape code: "{character}"!`}
                            values={{
                                character: error.context.text,
                            }}
                            />;

                        case "InvalidSubleqArgumentCountError": return <FormattedMessage
                            id="compilationErrorInvalidSubleqArgumentCountError"
                            description="Error message shown when the 'InvalidSubleqArgumentCountError' compilation error is encountered, indicating a 'subleq' instruction didn't have 2 or 3 addresses specified for it"
                            defaultMessage={`Invalid number of arguments for "subleq": {count} (must be between {rangeMin} and {rangeMax}, inclusive)!`}
                            values={{
                                count: error.context.number,
                                rangeMin: error.context.rangeMin,
                                rangeMax: error.context.rangeMax,
                            }}
                            />;

                        case "InvalidTokenError": return <FormattedMessage
                            id="compilationErrorInvalidTokenError"
                            description="Error message shown when the 'InvalidTokenError' compilation error is encountered, indicating an unrecognized token was encountered when parsing"
                            defaultMessage={`Invalid token: "{token}"!`}
                            values={{
                                token: error.context.text,
                            }}
                            />;

                        case "InvalidValueExpressionError": return <FormattedMessage
                            id="compilationErrorInvalidValueExpressionError"
                            description="Error message shown when the 'InvalidValueExpressionError' compilation error is encountered, indicating an unrecognized value expression was encountered"
                            defaultMessage={`Expected number, character, string, or reference, but got: "{token}"!`}
                            values={{
                                token: error.context.text,
                            }}
                            />;

                        case "LabelAlreadyDefinedError": return <FormattedMessage
                            id="compilationErrorLabelAlreadyDefinedError"
                            description="Error message shown when the 'LabelAlreadyDefinedError' compilation error is encountered, indicating a label was defined more than once"
                            defaultMessage={`Label already defined: "{label}"!`}
                            values={{
                                label: error.context.text,
                            }}
                            />;

                        case "MissingCommaOrWhitespaceError": return <FormattedMessage
                            id="compilationErrorMissingCommaOrWhitespaceError"
                            description="Error message shown when the 'MissingCommaOrWhitespaceError' compilation error is encountered, indicating there wasn't whitespace or a comma between arguments"
                            defaultMessage={`Whitespace or comma required before argument: "{argument}"`}
                            values={{
                                argument: error.context.text,
                            }}
                            />;

                        case "MissingWhitespaceError": return <FormattedMessage
                            id="compilationErrorMissingWhitespaceError"
                            description="Error message shown when the 'MissingWhitespaceError' compilation error is encountered, indicating there was no whitespace after a 'subleq' or '.data' command"
                            defaultMessage={`Whitespace is required after "{command}"!`}
                            values={{
                                command: error.context.text,
                            }}
                            />;

                        case "ProgramTooLargeError": return <FormattedMessage
                            id="compilationErrorProgramTooLargeError"
                            description="Error message shown when the 'ProgramTooLargeError' compilation error is encountered, indicating the compiled program doesn't fit into 253 bytes"
                            defaultMessage={`Program is too long (maximum size: {rangeMax} bytes; program size: {bytes} bytes)!`}
                            values={{
                                bytes: error.context.number,
                                rangeMax: error.context.rangeMax,
                            }}
                            />;

                        case "UndefinedReferenceError": return <FormattedMessage
                            id="compilationErrorUndefinedReferenceError"
                            description="Error message shown when the 'UndefinedReferenceError' compilation error is encountered, indicating a reference was made to an undeclared label"
                            defaultMessage={`Undefined reference: "{label}"!`}
                            values={{
                                label: error.context.text,
                            }}
                            />;

                        case "ValueRangeError": return <FormattedMessage
                            id="compilationErrorValueRangeError"
                            description="Error message shown when the 'ValueRangeError' compilation error is encountered, indicating a value didn't fit in a single signed byte"
                            defaultMessage={`Invalid value argument: {value} (must be an integer on the range [{rangeMin}, {rangeMax}])!`}
                            values={{
                                value: error.context.text,
                                rangeMin: error.context.rangeMin,
                                rangeMax: error.context.rangeMax,
                            }}
                            />;

                        default: return <FormattedMessage
                            id="compilationErrorInternal"
                            description="Error message shown when there was an unknown internal compiler error, indicating a bug in the compiler--this should never happen"
                            defaultMessage="Internal compiler error!"
                            />;
                    }
                })(error.errorType)
                }</p>
                {
                    (error.context && (error.context.sourceLineNumber !== undefined) && (error.context.sourceLine !== undefined))
                    ?
                        <FormattedMessage
                            id="textCompilationErrorContext"
                            description="Markup shown for the context of a compilation error, when a source line and line number are available"
                            defaultMessage="<p>On line {sourceLineNumber}:</p><p>{sourceLine}</p>"
                            values={{
                                sourceLineNumber: error.context.sourceLineNumber,
                                sourceLine: error.context.sourceLine,
                            }}
                            />
                    : null
                }
            </>,
        };
    }

    private createMessageHalt(expected: boolean): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTitleHalt"
                description="Window title for the message box that appears when a program halts"
                defaultMessage="Program Halted"
                />,
            body: <>
                <FormattedMessage
                    id="contentHalt"
                    description="Markup that is shown when a program halts"
                    defaultMessage={`<h3>Program Halted</h3><p>The program halted itself by branching to "@HALT" (address 255).</p>`}
                    />
                {expected
                    ? null
                    : <p>
                        <FormattedMessage
                            id="textHaltUnexpected"
                            description="Clarification that halting is not expected for all assigned tasks"
                            defaultMessage="All of your assigned tasks require the program to repeat indefinitely, so this is an error that must be corrected."
                            />
                    </p>}
            </>,
        }
    }

    private createMessageNoProgram(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTitleNoProgram"
                description="Window title for the message box that appears when attempting to run an empty program"
                defaultMessage="No Program"
                />,
            body: <FormattedMessage
                id="contentNoProgram"
                description="Markup that is shown when attempting to run an empty program"
                defaultMessage="<h3>No Program Loaded!</h3><p>Please compile and load a program.</p>"
                />,
        }
    }

    private createMessageAvoision(): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTitleAvoision"
                description="Window title for the Avoision message box"
                defaultMessage="Avoision"
                />,
            body: <>
                <AvoisionUI
                    colorScheme={this.props.colorScheme}
                    onClosed={() => this.playPuzzleMusic()}
                    onAchievement={() => this.ensureAchievement("AVOISION")}
                    />
            </>,
        };
    }

    private start() {
        const data = Sic1DataManager.getData();
        if (data.introCompleted) {
            this.messageBoxPush(this.createMessagePuzzleList("userStats"));
        } else {
            this.messageBoxPush(this.createMessageIntro());
        }

        this.playPuzzleMusic();
    }

    private createMessagePuzzleList(type: PuzzleListTypes, title?: string): MessageBoxContent {
        return {
            title: <FormattedMessage
                id="windowTasks"
                description="Window title for the 'program inventory' (shown when resuming and when selecting tasks)"
                defaultMessage="Program Inventory"
                />,
            width: "none",
            body: <PuzzleList
                intl={this.props.intl}
                clientPuzzlesGrouped={this.state.clientPuzzlesGrouped}
                initialItemType={type}
                initialItemTitle={title}
                onLoadPuzzleRequested={(puzzle, solutionName) => this.loadPuzzle(puzzle, solutionName)}
                hasUnreadMessages={hasUnreadMail()}
                onOpenMailViewerRequested={() => this.messageBoxReplace(this.createMessageMailViewer())}
                currentPuzzleIsSolved={Sic1DataManager.getPuzzleData(this.state.puzzle.title).solved}
                onClearMessageBoxRequested={() => this.messageBoxClear()}
                onPlayAvoisionRequested={() => {
                    Music.pause();
                    this.messageBoxReplace(this.createMessagePuzzleList("avoision"));
                    this.messageBoxPush(this.createMessageAvoision());
                }}
                onShowMessageBox={(content) => this.messageBoxPush(content)}
                onCloseMessageBox={() => this.messageBoxPop()}

                nextPuzzle={this.getNextPuzzle()}
            />
        };
    }

    private messageBoxReplace(messageBoxContent: MessageBoxContent) {
        this.setState(state => ({ messageBoxQueue: [messageBoxContent, ...state.messageBoxQueue.slice(1)] }));
    }

    private messageBoxPush(messageBoxContent: MessageBoxContent)  {
        this.setState(state => ({
            messageBoxQueue: [messageBoxContent, ...state.messageBoxQueue],
            previousFocus: state.previousFocus ?? document.activeElement,
        }));
    }

    private messageBoxClear() {
        this.setState(state => ({
            messageBoxQueue: [],
            previousFocus: undefined,
        }));
    }

    private messageBoxPop() {
        this.setState(state => ({
            messageBoxQueue: state.messageBoxQueue.slice(1),
            previousFocus: (state.messageBoxQueue.length === 1) ? undefined : state.previousFocus,
        }));
    }

    private playPuzzleMusic(): void {
        Music.play((this.state.puzzle.song ?? "default") as SongId);
    }

    public componentDidMount() {
        window.addEventListener("keydown", this.keyDownHandler);
        window.addEventListener("beforeunload", this.beforeUnloadHandler);
        Platform.onClosing = () => this.saveProgress();
        this.start();
    }

    public componentWillUnmount() {
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
        Platform.onClosing = undefined;
    }

    public componentDidUpdate(previousProps: Readonly<Sic1RootProps>, previousState: Readonly<Sic1RootState>, snapshot: any): void {
        const previousFocus = previousState.previousFocus;
        if ((this.state.previousFocus === undefined) && previousFocus) {
            if ((document.activeElement !== previousFocus) && document.body.contains(previousFocus) && previousFocus["focus"]) {
                previousFocus["focus"]();
            }
        }
    }

    public render() {
        // If all dialogs have been dismissed, change the song, if needed
        if (this.state.messageBoxQueue.length <= 0) {
            this.playPuzzleMusic();
        }

        return <>
            <Sic1Ide
                ref={this.ide}
                intl={this.props.intl}
                puzzle={this.state.puzzle}
                solutionName={this.state.solutionName}
                defaultCode={this.state.defaultCode}

                onCompilationError={(error) => {
                    this.playSoundIncorrect();
                    this.messageBoxClear();
                    this.messageBoxPush(this.createMessageCompilationError(error));
                }}
                onHalt={() => {
                    this.playSoundIncorrect();
                    this.messageBoxClear();
                    this.messageBoxPush(this.createMessageHalt(this.state.puzzle.title === "Sandbox Mode"));
                }}
                onNoProgram={() => {
                    this.playSoundIncorrect();
                    this.messageBoxClear();
                    this.messageBoxPush(this.createMessageNoProgram());

                    // Check for "self-destruct" achievement
                    if (this.ide.current && !this.ide.current.hasError() && this.ide.current.hasReadInput()) {
                        const programBytes = this.ide.current.getProgramBytes();
                        if (programBytes && programBytes.length > 0) {
                            for (const byte of programBytes) {
                                if (byte !== 0) {
                                    // Original program had non-zero content, but now program is empty: achieved!
                                    this.ensureAchievement("ERASE");
                                    break;
                                }
                            }
                        }
                    }
                }}
                onMenuRequested={() => this.toggleMenu() }
                onHelpRequested={() => this.messageBoxPush(this.createMessageHelp())}
                onShowMessageBox={(content) => this.messageBoxPush(content)}
                onCloseMessageBox={() => this.messageBoxPop()}
                onPuzzleCompleted={(cycles, bytes, programBytes) => {
                    this.playSoundCompleted();
                    this.puzzleCompleted(cycles, bytes, programBytes);
                }}
                onSaveRequested={() => this.saveProgress()}

                onOutputCorrect={() => this.playSoundCorrect()}
                onOutputIncorrect={() => this.playSoundIncorrect()}
                />
            <Toaster ref={this.toaster} />
            {
                (() => {
                    const contents: MessageBoxContent[] = [];
                    const queue = this.state.messageBoxQueue;
                    for (const content of queue) {
                        contents.push(content);

                        // Only continue if this message box is transparent
                        if (!content.transparent) {
                            break;
                        }
                    }

                    return contents.map((content, index) => <MessageBox
                        key={content.title}
                        {...content}
                        zIndex={50 - (10 * index)}
                        onDismissed={() => this.messageBoxPop()}
                        />);
                })()
            }
        </>;
    }
}
