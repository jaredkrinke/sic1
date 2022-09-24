import { Component, ComponentChild } from "preact";
import { Puzzle, puzzles } from "sic1-shared";
import { Browser, BrowserIndices, BrowserItem } from "./browser";
import { Chart } from "./chart";
import { PuzzleData, Sic1DataManager, UserData } from "./data-manager";
import { FriendLeaderboard } from "./friend-leaderboard";
import { Platform } from "./platform";
import { PuzzleFriendLeaderboardPromises } from "./service";
import { Shared } from "./shared";
import { Sic1UserStats } from "./user-stats";

interface PuzzleInfo {
    type: "puzzle";
    title: string;
    description: string;
    puzzle: Puzzle;
    puzzleData: PuzzleData;
}

type UserStatsInfo = BrowserItem & {
    type: "userStats";
}

interface PuzzleGroupInfo {
    title: string;
    items: PuzzleInfo[];
}
interface GroupInfo {
    title: string;
    items: (PuzzleInfo | UserStatsInfo)[];
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
        <Chart key={`${puzzleTitle}_cycles`} title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
        <Chart key={`${puzzleTitle}_bytes`} title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
        {
            Platform.service.getPuzzleFriendLeaderboardAsync
                ? <>
                    <br/>
                    <FriendLeaderboard key={`${puzzleTitle}_cycles_friends`} title="Cycles Executed (Friends)" promise={leaderboardPromises ? leaderboardPromises.cycles : Platform.service.getPuzzleFriendLeaderboardAsync(puzzleTitle, "cycles")} />
                    <FriendLeaderboard key={`${puzzleTitle}_cycles_bytes`} title="Bytes Read (Friends)" promise={leaderboardPromises ? leaderboardPromises.bytes : Platform.service.getPuzzleFriendLeaderboardAsync(puzzleTitle, "bytes")} />
                </>
                : null
        }
    </div>;
}

function findPuzzleIndicesByTitle(title: string): { groupIndex: number, itemIndex: number } {
    for (let groupIndex = 0; groupIndex < puzzles.length; groupIndex++) {
        const list = puzzles[groupIndex].list;
        for (let itemIndex = 0; itemIndex < list.length; itemIndex++) {
            if (list[itemIndex].title === title) {
                // Note: groupIndex + 1 to skip over the hard-coded "employee statistics" group
                return { groupIndex: groupIndex + 1, itemIndex };
            }
        }
    }

    return {
        groupIndex: 0,
        itemIndex: 0,
    };
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
                const chartData = await Platform.service.getUserStatsAsync(data.userId);

                // Highlight whatever solvedCount is expected locally. This is currently needed for Steam users (who
                // never upload solutions), but is arguably more user-friendly anyway.
                chartData.highlightedValue = data.solvedCount;
                return chartData;
            })()} />
        </>;
    }
}

export type PuzzleListNextPuzzle = "continue" | "nextUnsolved" | "none";

export interface PuzzleListProps {
    initialPuzzleTitle?: string;
    nextPuzzle?: Puzzle;
    hasUnreadMessages: boolean;
    currentPuzzleIsSolved: boolean;

    onLoadPuzzleRequested: (puzzle: Puzzle) => void;
    onOpenMailViewerRequested: () => void;
    onClearMessageBoxRequested: () => void;
}

export class PuzzleList extends Component<PuzzleListProps, { selection: BrowserIndices }> {
    private groups: GroupInfo[];

    constructor(props) {
        super(props);
        const unlocked = filterUnlockedPuzzles();

        // Hard-code a group for user statistics
        this.groups = [
            {
                title: "Employee Statistics",
                items: [
                    {
                        type: "userStats",
                        title: "Current Employee",
                        buttons: [
                            ...(this.props.hasUnreadMessages ? [{ title: "View Unread Electronic Mail", onClick: () => this.props.onOpenMailViewerRequested() }] : []),
                            ...(this.props.currentPuzzleIsSolved ? [] : [{ title: "Continue Editing Current Program", onClick: () => this.props.onClearMessageBoxRequested() }]),
                            ...(this.props.nextPuzzle ? [{ title: "View Next Incomplete Task", onClick: () => this.setState({ selection: findPuzzleIndicesByTitle(this.props.nextPuzzle.title) }) }] : []),
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
                        title: "Load this program",
                        onClick: () => this.props.onLoadPuzzleRequested(p.puzzle),
                    }
                ],
            })),
        })));

        // Open to either the requested puzzle or the user stats page
        this.state = { selection: this.props.initialPuzzleTitle ? findPuzzleIndicesByTitle(this.props.initialPuzzleTitle) : { groupIndex: 0, itemIndex: 0 } };
    }

    public render(): ComponentChild {
        const { groupIndex, itemIndex } = this.state.selection;
        const item = this.groups[groupIndex].items[itemIndex];
        const data = Sic1DataManager.getData();

        return <Browser className="puzzleBrowser" groups={this.groups} selection={this.state.selection} onSelectionChanged={(selection) => this.setState({ selection })}>
            {(() => {
                switch (item.type) {
                    case "puzzle":
                        return <PuzzleView puzzleInfo={item} data={data} />;

                    case "userStats":
                        return <UserStatsView data={data} />;
                }
            })()}
        </Browser>;
    }
}
