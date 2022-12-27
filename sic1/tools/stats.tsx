import { render, Component, ComponentChildren } from "preact";
import { Puzzle, puzzleFlatArray } from "../shared/puzzles";
import { sortAndNormalizeHistogramData } from "../client/ts/service";
import { Chart } from "../client/ts/chart";
import cache from "../client/ts/stats-cache";
import { HistogramData } from "../server/contract/dist";
import { ChartData } from "../client/ts/chart-model";

function toChartData(data: HistogramData, bucketCount = 20): ChartData {
    return {
        histogram: sortAndNormalizeHistogramData(data, bucketCount),
        highlightedValue: data[0].bucketMax,
    };
}

class Stats extends Component<{ puzzles: Puzzle[] }> {
    constructor(props) {
        super(props);
    }

    private createPuzzleCharts(puzzle: Puzzle): ComponentChildren {
        return <div className="charts">
            <Chart title={`Cycles Executed`} promise={Promise.resolve(toChartData(cache.puzzleStats[puzzle.title].cyclesExecutedBySolution))} />
            <Chart title={`Bytes Read`} promise={Promise.resolve(toChartData(cache.puzzleStats[puzzle.title].memoryBytesAccessedBySolution))}  />
        </div>;
    }

    public componentDidMount(): void {
        document.documentElement.style.setProperty("font-size", "90%");
    }

    public render() {
        return <>
            <div>
                <h3>Users</h3>
                <div className="charts">
                    <Chart title={`Completed Tasks`} promise={Promise.resolve(toChartData(cache.userStats.solutionsByUser, 30))} />
                </div>
            </div>
            {this.props.puzzles.map(puzzle => <div>
                <h3>{puzzle.title}</h3>
                {this.createPuzzleCharts(puzzle)}
            </div>)}
        </>;
    }
}

render(<Stats puzzles={puzzleFlatArray} />, document.getElementById("_stats"));
