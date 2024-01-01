import React from "react";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Chart } from "./chart";
import { PuzzleData, Sic1DataManager, UserData } from "./data-manager";
import { FriendLeaderboard } from "./friend-leaderboard";
import { Platform } from "./platform";
import { FriendLeaderboardEntry, PuzzleFriendLeaderboardPromises } from "./service";
import { Shared } from "./shared";
import { Sic1UserStats } from "./user-stats";
import createAvoisionInfo from "../content/tsx/avoision";
import { achievements } from "./achievements";
import { ClientPuzzle, ClientPuzzleGroup, hasCustomInput, puzzleSandbox } from "./puzzles";
import { SolutionManager } from "./solution-manager";
import { MessageBoxContent } from "./message-box";
import { FormattedMessage, IntlShape } from "react-intl";
import { formatContact } from "./contacts";

export type PuzzleListTypes = "puzzle" | "userStats" | "achievements" | "avoision";

interface PuzzleInfo {
    type: Extract<PuzzleListTypes, "puzzle">;
    title: React.ReactNode; // NOTE: This is the display title and *not* necessarily the puzzle title! E.g. it may include " (INCOMPLETE)"
    description: string;
    puzzle: ClientPuzzle;
    puzzleData: PuzzleData;
}

type NonPuzzleTypes = Exclude<PuzzleListTypes, "puzzle">;

type NonPuzzleInfo = BrowserItem & {
    type: NonPuzzleTypes;
}

interface PuzzleGroupInfo {
    title: React.ReactNode;
    items: PuzzleInfo[];
}

interface GroupInfo {
    title: React.ReactNode;
    items: (PuzzleInfo | NonPuzzleInfo)[];
}

function filterUnlockedPuzzleList(list: ClientPuzzle[]): PuzzleInfo[] {
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
                    type: "puzzle" as const,
                    title: puzzle.displayTitle,
                    description: puzzle.description,
                    puzzle,
                    puzzleData,
                };
            }
            return null;
        })
        .filter(puzzleInfo => !!puzzleInfo);
}

function filterUnlockedPuzzles(clientPuzzlesGrouped: ClientPuzzleGroup[]): PuzzleGroupInfo[] {
    return clientPuzzlesGrouped.map(group => ({
        title: group.groupTitle,
        items: filterUnlockedPuzzleList(group.list),
    })).filter(groupInfo => (groupInfo.items.length > 0));
}

export function createPuzzleCharts(puzzleTitle: string, cycles: number, bytes: number, leaderboardPromises?: PuzzleFriendLeaderboardPromises): React.ReactNode {
    const promise = Platform.service.getPuzzleStatsAsync(puzzleTitle, cycles, bytes);

    return <div className="charts">
        <Chart title={<FormattedMessage
            id="chartTitleCycles"
            description="Title for a 'cycles executed' chart"
            defaultMessage="Cycles Executed: {cycles}"
            values={{ cycles }}
            />} promise={(async () => (await promise).cycles)()} />
        <Chart title={<FormattedMessage
            id="chartTitleBytes"
            description="Title for a 'bytes read' chart"
            defaultMessage="Bytes Read: {bytes}"
            values={{ bytes }}
            />} promise={(async () => (await promise).bytes)()} />
        {
            Platform.service.getPuzzleFriendLeaderboardAsync
                ? <>
                    <br/>
                    <FriendLeaderboard
                        title={<FormattedMessage
                            id="chartFriendCycles"
                            description="Title of friend leaderboard for 'cycles executed'"
                            defaultMessage="Cycles Executed (Friends)"
                            />}
                        promise={leaderboardPromises ? leaderboardPromises.cycles : Platform.service.getPuzzleFriendLeaderboardAsync(puzzleTitle, "cycles")} />
                    <FriendLeaderboard
                        title={<FormattedMessage
                            id="chartFriendBytes"
                            description="Title of friend leaderboard for 'bytes read'"
                            defaultMessage="Bytes Read (Friends)"
                            />}
                        promise={leaderboardPromises ? leaderboardPromises.bytes : Platform.service.getPuzzleFriendLeaderboardAsync(puzzleTitle, "bytes")} />
                </>
                : null
        }
    </div>;
}

interface PuzzleViewProps {
    intl: IntlShape;
    puzzleInfo: PuzzleInfo;
    data: UserData;
    onLoadPuzzleRequested: (puzzle: ClientPuzzle, solutionName: string) => void;
    onShowMessageBox: (content: MessageBoxContent) => void;
    onCloseMessageBox: () => void;
}

class PuzzleView extends React.Component<PuzzleViewProps, { solutionName?: string }> {
    constructor(props) {
        super(props);

        let solutionName = this.props.puzzleInfo.puzzleData.currentSolutionName;
        if (!solutionName || !this.props.puzzleInfo.puzzleData.solutions || !this.props.puzzleInfo.puzzleData.solutions.find(s => s.name === solutionName)) {
            // No solution name set or no solutions or solution name doesn't exist; use the first name, if any
            solutionName = this.props.puzzleInfo.puzzleData.solutions[0]?.name;
        }

        this.state = { solutionName };
    }

    public getSelectedSolutionName(): string | undefined {
        return this.state.solutionName;
    }

    public render(): React.ReactNode {
        const { puzzleInfo, data } = this.props;
        const { title, description, puzzleData } = puzzleInfo;
        return <>
            <header>
            <FormattedMessage
                    id="taskViewerTaskHeading"
                    description="Heading content markup shown in the program inventory/task viewer for a particular task; use {newline} at the end of each line; note that {statusLine} is empty for Sandbox Mode"
                    defaultMessage="USER: {name}{newline}TASK: {title}{newline}{statusLine}{newline}{newline}DESCRIPTION: {description}"
                    values={{
                        newline: <br/>,
                        name: formatContact({
                                name: data.name,
                                title: Shared.getJobTitleForSolvedCount(data.solvedCount),
                            }),
                        title,
                        description,
                        statusLine: hasCustomInput(puzzleInfo.puzzle)
                            ? null
                            : <FormattedMessage
                                id="taskViewerStatusLine"
                                description="Line for status of the task heading shown in the task viewer"
                                defaultMessage="STATUS: {status}"
                                values={{
                                    status: puzzleData.solved
                                        ? <FormattedMessage
                                            id="taskViewerStatusCompleted"
                                            description="Status shown when a task has been completed"
                                            defaultMessage="Completed"
                                            />
                                        : Shared.resources.taskStatusIncomplete
                                }}
                                />,
                    }}
                    />
            </header>
            {puzzleInfo.puzzle.puzzleViewOverride ?? <>
                {(puzzleData.solved
                    ? <>
                        <p>{Shared.resources.taskStatistics}</p>
                        {createPuzzleCharts(puzzleInfo.puzzle.title, puzzleData.solutionCycles, puzzleData.solutionBytes)}
                    </>
                    : <>
                        <p>
                            <FormattedMessage
                                id="taskViewerTextIncomplete"
                                description="Text shown in the task selector when a task has not been successfully implemented yet"
                                defaultMessage={"You have not implemented this program yet. Click \"Load This Program\" at the bottom of this window to load the program into the editor."}
                                />
                        </p>
                </>)}
            </>}
            <h3>
                <FormattedMessage
                    id="taskViewerHeadingFile"
                    description="Heading for the 'file selection' (save management) part of a task"
                    defaultMessage="File Selection"
                    />
            </h3>
            <SolutionManager
                intl={this.props.intl}
                puzzleTitle={puzzleInfo.puzzle.title}
                solutionName={this.state.solutionName}
                onSelectionChanged={(solutionName) => this.setState({ solutionName })}
                onOpen={(solutionName) => this.props.onLoadPuzzleRequested(puzzleInfo.puzzle, solutionName)}
                onShowMessageBox={(content) => this.props.onShowMessageBox(content)}
                onCloseMessageBox={() => this.props.onCloseMessageBox()}
                />
        </>;
    }
}

class UserHeading extends React.Component<{ data: UserData }> {
    public render(): React.ReactNode {
        const { data } = this.props;
        return <FormattedMessage
            id="taskViewerHeadingUser"
            description="Markup for the heading shown on a user-specific page of the program inventory/task viewer; use {newline} in between lines"
            defaultMessage="USER: {name}{newline}TITLE: {title}"
            values={{
                newline: <br/>,
                name: data.name,
                title: Shared.getJobTitleForSolvedCount(data.solvedCount),
            }}
            />;
    }
}

class UserStatsView extends React.Component<{ data: UserData }> {
    public render(): React.ReactNode {
        const { data } = this.props;
        return <>
            <header>
                <UserHeading data={data}/>
            </header>
            <FormattedMessage
                id="taskViewerMotivation"
                description="Motivational message from employer introducing task completion statistics"
                defaultMessage="<p>SIC Systems appreciates your continued effort.</p><p>For motivational purposes, here is how the number of tasks you have completed compares to other engineers.</p>"
                />
            <Sic1UserStats promise={(async () => {
                const chartData = await Platform.service.getUserStatsAsync(data.userId, data.solvedCount);
                return chartData;
            })()} />
        </>;
    }
}

class AchievementSummary extends React.Component<{ promises: Promise<boolean>[] }, { achievedCount?: number | null }> {
    public constructor(props) {
        super(props);
        this.state = {};
    }

    public async componentDidMount() {
        let achievedCount = 0;
        try {
            for (const achieved of await Promise.all(this.props.promises)) {
                if (achieved) {
                    achievedCount++;
                }
            }

            this.setState({ achievedCount });
        } catch {
            this.setState({ achievedCount: null });
        }
    }

    public render(): React.ReactNode {
        const achievementCount = this.props.promises.length;
        const { achievedCount } = this.state;
        switch (achievedCount) {
            case undefined: return <span>(loading...)</span>;
            case null: return <span>(load failed)</span>;
            default: return <>{achievedCount} of {achievementCount} ({Math.round(100 * achievedCount / achievementCount)}%)</>;
        }
    }
}

class AchievementIcon extends React.Component<{ imageUri: string, promise: Promise<boolean> }, { achieved: boolean }> {
    public constructor(props) {
        super(props);
        this.state = { achieved: false };
    }

    public async componentDidMount() {
        try {
            const achieved = await this.props.promise;
            this.setState({ achieved });
        } catch {
            // Assume not achieved
        }
    }

    public render(): React.ReactNode {
        return <img src={this.state.achieved ? this.props.imageUri : Shared.blankImageDataUri} width={64} height={64}/>;
    }
}

class AchievementsView extends React.Component<{ data: UserData }> {
    public render(): React.ReactNode {
        const promises: Promise<boolean>[] = [];
        const idToPromise: { [id: string]: Promise<boolean> } = {};
        for (const [id, achievement] of Object.entries(achievements)) {
            const promise = Platform.getAchievementAsync?.(id) ?? Promise.resolve(false);
            idToPromise[id] = promise;
            promises.push(promise);
        }
        
        const { data } = this.props;
        return <>
            <header>
                <UserHeading data={data}/>
            </header>
            <h3>Achievement Progress: <AchievementSummary promises={promises}/></h3>
            <table className="achievements">
                <tbody>
                    {Object.entries(achievements).map(([id, a]) => <tr><td>
                        <div className="achievement">
                            <AchievementIcon imageUri={a.imageUri} promise={idToPromise[id]}/>
                            <div>
                                <p className="title">{a.title}</p>
                                <p>{a.description}</p>
                            </div>
                        </div>
                    </td></tr>)}
                </tbody>
            </table>
        </>;
    }
}

class AvoisionView extends React.Component<{ data: UserData }> {
    private static defaultScores: FriendLeaderboardEntry[] = [
        { name: "Jerin", score: 249 },
        { name: "Pat", score: 214 },
        { name: "Ted", score: 164 },
    ];

    private static mergeSortAndDedupe(...arrays: FriendLeaderboardEntry[][]): FriendLeaderboardEntry[] {
        const result: FriendLeaderboardEntry[] = [];
        for (const array of arrays) {
            for (const entry of array) {
                result.push(entry);
            }
        }

        // Sort and remove duplicates
        result.sort((a, b) => ((b.score - a.score) || a.name.localeCompare(b.name)));
        for (let i = 1; i < result.length; i++) {
            const p = result[i - 1];
            const c = result[i];
            if (p.name === c.name && p.score === c.score) {
                result.splice(i--, 1);
            }
        }
        return result;
    }

    public render(): React.ReactNode {
        const { data } = this.props;
        const name = Sic1DataManager.getData().name;
        const defaultScores = AvoisionView.defaultScores;
        const localHighScore = Sic1DataManager.getAvoisionData().score;
        const localScores = localHighScore ? [{ name, score: localHighScore }] : [];
        
        const promise = Platform.service.getFriendLeaderboardAsync
            ? (async () => AvoisionView.mergeSortAndDedupe(
                defaultScores,
                localScores,
                await Platform.service.getFriendLeaderboardAsync("Avoision")
                ))()
            : Promise.resolve(AvoisionView.mergeSortAndDedupe(
                defaultScores,
                localScores,
                ));

        return <>
            <header>
                <FormattedMessage
                    id="taskViewerHeadingAvoision"
                    description="Markup for the heading shown for Avoisoin in the task viewer; use {newline} in between lines"
                    defaultMessage="USER: {name}{newline}PROGRAM: Avoision"
                    values={{
                        newline: <br/>,
                        name: formatContact({
                            name: data.name,
                            title: Shared.getJobTitleForSolvedCount(data.solvedCount)
                        }),
                    }}
                    />
            </header>
            {createAvoisionInfo()}
            <br/>
            <div className="charts">
                <FriendLeaderboard
                    title={<FormattedMessage
                        id="chartFriendAvoision"
                        description="Title of friend leaderboard chart for Avoision high scores"
                        defaultMessage="Avoision High Scores"
                        />}
                    promise={promise}
                    />
            </div>
        </>;
    }
}

export type PuzzleListNextPuzzle = "continue" | "nextUnsolved" | "none";

export interface PuzzleListProps {
    intl: IntlShape;
    clientPuzzlesGrouped: ClientPuzzleGroup[];
    initialItemType?: PuzzleListTypes;
    initialItemTitle?: string;
    nextPuzzle?: ClientPuzzle;
    hasUnreadMessages: boolean;
    currentPuzzleIsSolved: boolean;

    onLoadPuzzleRequested: (puzzle: ClientPuzzle, solutionName: string) => void;
    onOpenMailViewerRequested: () => void;
    onClearMessageBoxRequested: () => void;
    onPlayAvoisionRequested: () => void;
    onShowMessageBox: (content: MessageBoxContent) => void;
    onCloseMessageBox: () => void;
}

interface PuzzleListState {
    groups: GroupInfo[];
    selection: BrowserIndices;
}

export class PuzzleList extends React.Component<PuzzleListProps, PuzzleListState> {
    private puzzleView = React.createRef<PuzzleView>();

    constructor(props) {
        super(props);
        const unlocked = filterUnlockedPuzzles(props.clientPuzzlesGrouped);

        // Hard-code a group for user statistics, etc.
        const groups: GroupInfo[] = [
            {
                title: <FormattedMessage
                    id="headingProgress"
                    description="Heading for 'task progress' and 'achievements' group in the program inventory/task selector window"
                    defaultMessage="Employee Statistics"
                    />,
                items: [
                    {
                        type: "userStats",
                        title: <FormattedMessage
                            id="taskProgress"
                            description="Title of the 'task progress' item in the program inventory/task selector window"
                            defaultMessage="Task Progress"
                            />,
                        buttons: [
                            ...(this.props.hasUnreadMessages
                                ? [
                                    {
                                        title: <FormattedMessage
                                            id="taskViewerButtonViewUnread"
                                            description="Text on button for viewing unread mail"
                                            defaultMessage="View Unread Electronic Mail"
                                            />,
                                        onClick: () => this.props.onOpenMailViewerRequested(),
                                    }
                                ]
                                : []),
                            ...(this.props.currentPuzzleIsSolved
                                ? (this.props.nextPuzzle
                                    ? [
                                        {
                                            title: <FormattedMessage
                                                id="taskViewerButtonNextIncompleteTask"
                                                description="Text on button for viewing the next incomplete task"
                                                defaultMessage="View Next Incomplete Task"
                                                />,
                                            onClick: () => this.setState(state => ({ selection: this.findIndices(state.groups, "puzzle", this.props.nextPuzzle.title) })),
                                        }
                                    ]
                                    : [])
                                : [
                                    {
                                        title: <FormattedMessage
                                            id="taskViewerButtonContinueEditing"
                                            description="Text on button for continuing editing the current program"
                                            defaultMessage="Continue Editing Current Program"
                                            />,
                                        onClick: () => this.props.onClearMessageBoxRequested(),
                                    }
                                ]),
                        ],
                    },
                    {
                        type: "achievements",
                        title: <FormattedMessage
                            id="taskAchievements"
                            description="Title of the 'achievements' item in the program inventory/task selector window"
                            defaultMessage="Achievements"
                            />,
                    },
                ],
            },
        ];

        // Add unlockable diversions
        const solvedCount = Sic1DataManager.getData().solvedCount;
        const diversionItems: (PuzzleInfo | NonPuzzleInfo)[] = [];
        if (solvedCount >= Shared.avoisionSolvedCountRequired) {
            diversionItems.push({
                type: "avoision",
                title: "Avoision",
                onDoubleClick: () => this.props.onPlayAvoisionRequested(),
                buttons: [
                    {
                        title: <FormattedMessage
                            id="taskViewerButtonAvoision"
                            description="Text on button for playing Avoision"
                            defaultMessage="Play Avoision"
                            />,
                        onClick: () => this.props.onPlayAvoisionRequested(),
                    },
                ],
            });
        }

        if (solvedCount >= puzzleSandbox.minimumSolvedToUnlock) {
            diversionItems.push(filterUnlockedPuzzleList([puzzleSandbox]).map(p => ({
                ...p,
                onDoubleClick: () => this.props.onLoadPuzzleRequested(p.puzzle, this.puzzleView.current?.getSelectedSolutionName?.()),
                buttons: [
                    {
                        title: <FormattedMessage
                            id="taskViewerButtonSandbox"
                            description="Text on button for Sandbox Mode"
                            defaultMessage="Enter Sandbox Mode"
                            />,
                        onClick: () => this.props.onLoadPuzzleRequested(p.puzzle, this.puzzleView.current?.getSelectedSolutionName?.()),
                    }
                ],
            }))[0]);
        }

        if (diversionItems.length > 0) {
            groups.push({
                title: <FormattedMessage
                    id="taskDiversions"
                    description="Title of the 'diversions' group in the program inventory/task selector window"
                    defaultMessage="Diversions"
                    />,
                items: diversionItems,
            });
        }

        // Add unlocked story puzzles
        let gi = 0;
        groups.push(...unlocked.map(g => ({
            title: <FormattedMessage
                id="taskNumberedList"
                description="Format for a numbered group in the program inventory/task selection window"
                defaultMessage="{number}. {title}"
                values={{
                    number: ++gi,
                    title: g.title,
                }}
                />,
            items: g.items.map(p => ({
                ...p,
                title: p.puzzleData.solved
                    ? p.title
                    : <FormattedMessage
                        id="taskWithStatus"
                        description="Format for showing a task with incomplete or new status"
                        defaultMessage="{title} ({status})"
                        values={{
                            title: p.title,
                            status: p.puzzleData.viewed
                                // TODO: Stylize with CSS instead of capitals
                                ? Shared.resources.taskStatusIncomplete
                                : <FormattedMessage
                                    id="taskStatusNew"
                                    description="Status shown for a task that has not yet been viewed"
                                    defaultMessage="New"
                                    />,
                        }}
                        />,
                onDoubleClick: () => this.props.onLoadPuzzleRequested(p.puzzle, this.puzzleView.current?.getSelectedSolutionName?.()),
                buttons: [
                    {
                        title: <FormattedMessage
                            id="taskViewerButtonLoad"
                            description="Text on button for loading the selected program"
                            defaultMessage="Load This Program"
                            />,
                        onClick: () => this.props.onLoadPuzzleRequested(p.puzzle, this.puzzleView.current?.getSelectedSolutionName?.()),
                    }
                ],
            })),
        })));

        // Open to either the requested puzzle or the user stats page
        this.state = {
            groups,
            selection: this.findIndices(groups, this.props.initialItemType, this.props.initialItemTitle),
        };
    }

    private findIndices(groups: GroupInfo[], type?: PuzzleListTypes, title?: string): { groupIndex: number, itemIndex: number } {
        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            const list = groups[groupIndex].items;
            for (let itemIndex = 0; itemIndex < list.length; itemIndex++) {
                const item = list[itemIndex];
                // Note: Compare against puzzle title instead of item title due to potential " (NEW)", etc. suffixes
                if ((item.type === type) && (!title || (type === "puzzle" ? (title === (item as PuzzleInfo).puzzle.title) : (item.title === title)))) {
                    return { groupIndex, itemIndex };
                }
            }
        }
    
        return {
            groupIndex: 0,
            itemIndex: 0,
        };
    }
    
    public render(): React.ReactNode {
        const { groupIndex, itemIndex } = this.state.selection;
        const item = this.state.groups[groupIndex].items[itemIndex];
        const data = Sic1DataManager.getData();

        return <Browser className="puzzleBrowser" groups={this.state.groups} selection={this.state.selection} onSelectionChanged={(selection) => this.setState({ selection })}>
            {(() => {
                switch (item.type) {
                    case "puzzle":
                        return <PuzzleView
                            ref={this.puzzleView}
                            key={item.puzzle.title}
                            intl={this.props.intl}
                            puzzleInfo={item} data={data}
                            onLoadPuzzleRequested={(puzzle, solutionName) => this.props.onLoadPuzzleRequested(puzzle, solutionName)}
                            onShowMessageBox={(content) => this.props.onShowMessageBox(content)}
                            onCloseMessageBox={() => this.props.onCloseMessageBox()}
                            />;

                    case "userStats":
                        return <UserStatsView key="userStats" data={data} />;

                    case "achievements":
                        return <AchievementsView key="achievements" data={data} />;

                    case "avoision":
                        return <AvoisionView key="avoision" data={data} />;
                }
            })()}
        </Browser>;
    }
}
