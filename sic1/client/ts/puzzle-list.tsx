import { Component, ComponentChild, ComponentChildren, createRef } from "preact";
import { Puzzle, PuzzleGroup, puzzles } from "sic1-shared";
import { Chart } from "./chart";
import { PuzzleData, Sic1DataManager } from "./data-manager";
import { Platform } from "./platform";
import { Shared } from "./shared";

interface PuzzleInfo {
    puzzle: Puzzle;
    puzzleData: PuzzleData;
}

interface PuzzleGroupInfo {
    group: PuzzleGroup;
    puzzleInfos: PuzzleInfo[];
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
        group,
        puzzleInfos: filterUnlockedPuzzleList(group.list),
    })).filter(groupInfo => (groupInfo.puzzleInfos.length > 0));
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

function findPuzzleIndicesByTitle(title: string): { groupIndex: number, puzzleIndex: number } {
    for (let groupIndex = 0; groupIndex < puzzles.length; groupIndex++) {
        const list = puzzles[groupIndex].list;
        for (let puzzleIndex = 0; puzzleIndex < list.length; puzzleIndex++) {
            if (list[puzzleIndex].title === title) {
                return { groupIndex, puzzleIndex };
            }
        }
    }

    return {
        groupIndex: 0,
        puzzleIndex: 0,
    };
}

export class PuzzleList extends Component<{ initialPuzzleTitle: string, onLoadPuzzleRequested: (puzzle: Puzzle) => void }, { groupIndex: number, puzzleIndex: number }> {
    private unlocked: PuzzleGroupInfo[];
    private initialSelectedDiv = createRef<HTMLDivElement>();

    constructor(props) {
        super(props);
        this.unlocked = filterUnlockedPuzzles();
        this.state = findPuzzleIndicesByTitle(this.props.initialPuzzleTitle);
    }

    public componentDidMount() {
        Shared.scrollElementIntoView(this.initialSelectedDiv.current, "center");
    }

    public render(): ComponentChild {
        const data = Sic1DataManager.getData();
        const { onLoadPuzzleRequested } = this.props;
        const { puzzle, puzzleData } = this.unlocked[this.state.groupIndex].puzzleInfos[this.state.puzzleIndex];

        return <div className="browser puzzleBrowser">
            <div className="browserList puzzleList">{this.unlocked.map((g, gi) => <>
                <p>{gi + 1}. {g.group.groupTitle}</p>
                <div>
                    {g.puzzleInfos.map((p, pi) => <div ref={(this.state.groupIndex === gi && this.state.puzzleIndex === pi) ? this.initialSelectedDiv : null} className={(this.state.groupIndex === gi && this.state.puzzleIndex === pi) ? "selected" : ""} onDblClick={() => this.props.onLoadPuzzleRequested(p.puzzle)} onClick={() => this.setState({ groupIndex: gi, puzzleIndex: pi })}>
                        <p>{p.puzzle.title} {p.puzzleData.solved ? "" : (p.puzzleData.viewed ? "(INCOMPLETE)" : "(NEW)")}</p>
                    </div>)}
                </div>
            </>)}</div>
            <div className="browserView puzzleView">
                <div>
                    <header>
                        USER: {data.name} ({Shared.getJobTitleForSolvedCount(data.solvedCount)})<br />
                        TASK: {puzzle.title}<br />
                        STATUS: {puzzleData.solved ? "COMPLETED" : "INCOMPLETE"}<br />
                        <br />
                        DESCRIPTION: {puzzle.description}
                    </header>
                    {puzzleData.solved
                        ? <>
                            <p>Here are performance statistics of your program (as compared to others' programs):</p>
                            {createPuzzleCharts(puzzle.title, puzzleData.solutionCycles, puzzleData.solutionBytes)}
                        </>
                        : <>
                            <p>You have not implemented this program yet. Click the button at the bottom of this window to load the program into the editor.</p>
                    </>}
                </div>
                <button onClick={() => this.props.onLoadPuzzleRequested(puzzle)}>&gt; Load this program &lt;</button>
            </div>
        </div>;
    }
}
