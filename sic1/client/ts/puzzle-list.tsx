import { Component, ComponentChild, ComponentChildren, createRef } from "preact";
import { Puzzle, puzzles } from "sic1-shared";
import { Browser } from "./browser";
import { Chart } from "./chart";
import { PuzzleData, Sic1DataManager, UserData } from "./data-manager";
import { Platform } from "./platform";
import { Shared } from "./shared";

interface PuzzleInfo {
    title: string;
    description: string;
    puzzle: Puzzle;
    puzzleData: PuzzleData;
}

interface PuzzleGroupInfo {
    title: string;
    items: PuzzleInfo[];
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

export function createPuzzleCharts(puzzleTitle: string, cycles: number, bytes: number, continuation?: () => void): ComponentChildren {
    const promise = Platform.service.getPuzzleStatsAsync(puzzleTitle, cycles, bytes);
    if (continuation) {
        promise.then(continuation).catch(continuation);
    }

    return <div className="charts">
        <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
        <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
    </div>;
}

function findPuzzleIndicesByTitle(title: string): { groupIndex: number, itemIndex: number } {
    for (let groupIndex = 0; groupIndex < puzzles.length; groupIndex++) {
        const list = puzzles[groupIndex].list;
        for (let itemIndex = 0; itemIndex < list.length; itemIndex++) {
            if (list[itemIndex].title === title) {
                return { groupIndex, itemIndex };
            }
        }
    }

    return {
        groupIndex: 0,
        itemIndex: 0,
    };
}

export class PuzzleList extends Component<{ initialPuzzleTitle: string, onLoadPuzzleRequested: (puzzle: Puzzle) => void }> {
    private unlocked: PuzzleGroupInfo[];

    constructor(props) {
        super(props);
        this.unlocked = filterUnlockedPuzzles();
    }

    private renderPuzzle(puzzleInfo: PuzzleInfo, data: UserData): ComponentChild {
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

    public render(): ComponentChild {
        let gi = 0;
        const groups = this.unlocked.map(g => ({
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
        }));

        return <Browser<PuzzleInfo> className="puzzleBrowser" groups={groups} initial={findPuzzleIndicesByTitle(this.props.initialPuzzleTitle)} renderItem={(item, data) => this.renderPuzzle(item, data)} />;
    }
}
