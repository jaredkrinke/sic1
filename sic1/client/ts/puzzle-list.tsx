import { Component, ComponentChild } from "preact";
import { Puzzle, puzzles } from "sic1-shared";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Chart } from "./chart";
import { PuzzleData, Sic1DataManager, UserData } from "./data-manager";
import { FriendLeaderboard } from "./friend-leaderboard";
import { Platform } from "./platform";
import { FriendLeaderboardEntry, PuzzleFriendLeaderboardPromises } from "./service";
import { Shared } from "./shared";
import { Sic1UserStats } from "./user-stats";
import createAvoisionInfo from "../content/tsx/avoision";

export type PuzzleListTypes = "puzzle" | "userStats" | "avoision";

interface PuzzleInfo {
    type: Extract<PuzzleListTypes, "puzzle">;
    title: string;
    description: string;
    puzzle: Puzzle;
    puzzleData: PuzzleData;
}

type NonPuzzleTypes = Exclude<PuzzleListTypes, "puzzle">;

type NonPuzzleInfo = BrowserItem & {
    type: NonPuzzleTypes;
}

interface PuzzleGroupInfo {
    title: string;
    items: PuzzleInfo[];
}
interface GroupInfo {
    title: string;
    items: (PuzzleInfo | NonPuzzleInfo)[];
}

function filterUnlockedPuzzleList(list: Puzzle[]): PuzzleInfo[] {
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
                    title: puzzle.title,
                    description: puzzle.description,
                    puzzle,
                    puzzleData,
                };
            }
            return null;
        })
        .filter(puzzleInfo => !!puzzleInfo);
}

function filterUnlockedPuzzles(): PuzzleGroupInfo[] {
    return puzzles.map(group => ({
        title: group.groupTitle,
        items: filterUnlockedPuzzleList(group.list),
    })).filter(groupInfo => (groupInfo.items.length > 0));
}

export function createPuzzleCharts(puzzleTitle: string, cycles: number, bytes: number, leaderboardPromises?: PuzzleFriendLeaderboardPromises): ComponentChild {
    const promise = Platform.service.getPuzzleStatsAsync(puzzleTitle, cycles, bytes);

    return <div className="charts">
        <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
        <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
        {
            Platform.service.getPuzzleFriendLeaderboardAsync
                ? <>
                    <br/>
                    <FriendLeaderboard title="Cycles Executed (Friends)" promise={leaderboardPromises ? leaderboardPromises.cycles : Platform.service.getPuzzleFriendLeaderboardAsync(puzzleTitle, "cycles")} />
                    <FriendLeaderboard title="Bytes Read (Friends)" promise={leaderboardPromises ? leaderboardPromises.bytes : Platform.service.getPuzzleFriendLeaderboardAsync(puzzleTitle, "bytes")} />
                </>
                : null
        }
    </div>;
}

class PuzzleView extends Component<{ puzzleInfo: PuzzleInfo, data: UserData }> {
    public render(): ComponentChild {
        const { puzzleInfo, data } = this.props;
        const { title, description, puzzleData } = puzzleInfo;
        return <>
            <header>
                USER: {data.name} ({Shared.getJobTitleForSolvedCount(data.solvedCount)})<br />
                TASK: {title}<br />
                STATUS: {puzzleData.solved ? "COMPLETED" : "INCOMPLETE"}<br />
                <br />
                DESCRIPTION: {description}
            </header>
            {puzzleData.solved
                ? <>
                    <p>Here are performance statistics of your program (as compared to others' programs):</p>
                    {createPuzzleCharts(title, puzzleData.solutionCycles, puzzleData.solutionBytes)}
                </>
                : <>
                    <p>You have not implemented this program yet. Click the button at the bottom of this window to load the program into the editor.</p>
            </>}
        </>;
    }
}

class UserStatsView extends Component<{ data: UserData }> {
    public render(): ComponentChild {
        const { data } = this.props;
        return <>
            <header>
                USER: {data.name}<br />
                TITLE: {Shared.getJobTitleForSolvedCount(data.solvedCount)}
            </header>
            <p>SIC Systems appreciates your continued effort.</p>
            <p>For motivational purposes, here is how the number of tasks you have completed compares to other engineers.</p>
            <Sic1UserStats promise={(async () => {
                const chartData = await Platform.service.getUserStatsAsync(data.userId, data.solvedCount);
                return chartData;
            })()} />
        </>;
    }
}

class AvoisionView extends Component<{ data: UserData }> {
    private static defaultScores: FriendLeaderboardEntry[] = [
        { name: "Jerin", score: 249 },
        { name: "Lisa", score: 174 },
        { name: "Paul", score: 129 },
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

    public render(): ComponentChild {
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
                USER: {this.props.data.name} ({Shared.getJobTitleForSolvedCount(this.props.data.solvedCount)})<br />
                PROGRAM: Avoision<br />
            </header>
            {createAvoisionInfo()}
            <br/>
            <div className="charts">
                <FriendLeaderboard
                    title="Avoision High Scores"
                    promise={promise}
                    />
            </div>
        </>;
    }
}

export type PuzzleListNextPuzzle = "continue" | "nextUnsolved" | "none";

export interface PuzzleListProps {
    initialItemType?: PuzzleListTypes;
    initialItemTitle?: string;
    nextPuzzle?: Puzzle;
    hasUnreadMessages: boolean;
    currentPuzzleIsSolved: boolean;

    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
    onOpenMailViewerRequested: () => void;
    onClearMessageBoxRequested: () => void;
    onPlayAvoisionRequested: () => void;
}

export class PuzzleList extends Component<PuzzleListProps, { selection: BrowserIndices }> {
    private groups: GroupInfo[];

    constructor(props) {
        super(props);
        const unlocked = filterUnlockedPuzzles();

        // Hard-code a group for user statistics, etc.
        this.groups = [
            {
                title: "Employee Statistics",
                items: [
                    {
                        type: "userStats",
                        title: "Task Progress",
                        buttons: [
                            ...(this.props.hasUnreadMessages ? [{ title: "View Unread Electronic Mail", onClick: () => this.props.onOpenMailViewerRequested() }] : []),
                            ...(this.props.currentPuzzleIsSolved
                                ? (this.props.nextPuzzle ? [{ title: "View Next Incomplete Task", onClick: () => this.setState({ selection: this.findIndices("puzzle", this.props.nextPuzzle.title) }) }] : [])
                                : [{ title: "Continue Editing Current Program", onClick: () => this.props.onClearMessageBoxRequested() }]),
                        ],
                    },
                ],
            },
            {
                title: "Diversions",
                items: [
                    {
                        type: "avoision",
                        title: "Avoision",
                        onDoubleClick: () => this.props.onPlayAvoisionRequested(),
                        buttons: [
                            { title: "Play Avoision", onClick: () => this.props.onPlayAvoisionRequested() },
                        ],
                    },
                ],
            },
        ];

        let gi = 0;
        this.groups.push(...unlocked.map(g => ({
            title: `${++gi}. ${g.title}`,
            items: g.items.map(p => ({
                ...p,
                title: `${p.title}${p.puzzleData.solved ? "" : (p.puzzleData.viewed ? " (INCOMPLETE)" : " (NEW)")}`,
                onDoubleClick: () => this.props.onLoadPuzzleRequested(p.puzzle),
                buttons: [
                    {
                        title: "Load This Program",
                        onClick: () => this.props.onLoadPuzzleRequested(p.puzzle),
                    }
                ],
            })),
        })));

        // Open to either the requested puzzle or the user stats page
        this.state = { selection: this.findIndices(this.props.initialItemType, this.props.initialItemTitle) };
    }

    private findIndices(type?: PuzzleListTypes, title?: string): { groupIndex: number, itemIndex: number } {
        for (let groupIndex = 0; groupIndex < this.groups.length; groupIndex++) {
            const list = this.groups[groupIndex].items;
            for (let itemIndex = 0; itemIndex < list.length; itemIndex++) {
                const item = list[itemIndex];
                // Note: Compare against puzzle title instead of itme title due to potential " (NEW)", etc. suffixes
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
    
    public render(): ComponentChild {
        const { groupIndex, itemIndex } = this.state.selection;
        const item = this.groups[groupIndex].items[itemIndex];
        const data = Sic1DataManager.getData();

        return <Browser className="puzzleBrowser" groups={this.groups} selection={this.state.selection} onSelectionChanged={(selection) => this.setState({ selection })}>
            {(() => {
                switch (item.type) {
                    case "puzzle":
                        return <PuzzleView key={item.puzzle.title} puzzleInfo={item} data={data} />;

                    case "userStats":
                        return <UserStatsView key="userStats" data={data} />;

                    case "avoision":
                        return <AvoisionView key="avoision" data={data} />;
                }
            })()}
        </Browser>;
    }
}
