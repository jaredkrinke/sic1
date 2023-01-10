import { render, Component, ComponentChildren, createRef } from "preact";
import { Puzzle, puzzleFlatArray } from "../shared/puzzles";
import { sortAndNormalizeHistogramData } from "../client/ts/service";
import { Chart } from "../client/ts/chart";
import { webStatsCache, steamStatsCache } from "../client/ts/stats-cache";
import { HistogramData } from "../server/contract/dist";
import { ChartData } from "../client/ts/chart-model";

function toChartData(data: HistogramData, bucketCount = 20): ChartData {
    return {
        histogram: sortAndNormalizeHistogramData(data, bucketCount),
        highlightedValue: data[0]?.bucketMax ?? 0,
    };
}

function Checkbox(props: { label: string, onChange: (checked: boolean) => void, isChecked: boolean }) {
    return <label><input type="checkbox" onChange={event => props.onChange(event.currentTarget.checked)} checked={props.isChecked} />{this.props.label}</label>;
}

class Root extends Component<{}, { web: boolean, steam: boolean, tiny: boolean }> {
    constructor(props) {
        super(props);
        this.state = {
            web: true,
            steam: true,
            tiny: false,
        };
    }

    private createPuzzleCharts(puzzle: Puzzle): ComponentChildren {
        return <div className="charts">
            {[
                ["Cycles Executed", "cyclesExecutedBySolution"],
                ["Bytes Read", "memoryBytesAccessedBySolution"],
            ].map(([label, property]) => 
                <Chart key={`${label} ${this.state.web} ${this.state.steam}`} title={label} promise={Promise.resolve(toChartData([].concat(
                    this.state.web ? webStatsCache.puzzleStats[puzzle.title][property] : [],
                    this.state.steam ? steamStatsCache.puzzleStats[puzzle.title][property] : [],
                )))} />
            )}
        </div>;
    }

    public componentDidUpdate(previousProps: Readonly<{}>, previousState: Readonly<{ web: boolean; steam: boolean; tiny: boolean; }>, snapshot: any): void {
        if (previousState.tiny !== this.state.tiny) {
            document.getElementById("_stats").style.setProperty("font-size", this.state.tiny ? "42%" : "100%");
        }
    }

    public render() {
        return <>
            <div id="_controls">
                <Checkbox label="Web" onChange={checked => this.setState({ web: checked })} isChecked={this.state.web}/><br/>
                <Checkbox label="Steam" onChange={checked => this.setState({ steam: checked })} isChecked={this.state.steam}/><br/>
                <Checkbox label="Tiny" onChange={checked => this.setState({ tiny: checked })} isChecked={this.state.tiny}/><br/>
            </div>
            <div id="_stats">
                <div>
                    <h3>Users</h3>
                    <div className="charts">
                        <Chart key={`Completed Tasks ${this.state.web} ${this.state.steam}`} title={`Completed Tasks`} promise={Promise.resolve(toChartData([].concat(
                            this.state.web ? webStatsCache.userStats.solutionsByUser : [],
                            this.state.steam ? steamStatsCache.userStats.solutionsByUser : [],
                        ), 30))} />
                    </div>
                </div>
                {puzzleFlatArray.map(puzzle => <div>
                    <h3>{puzzle.title}</h3>
                    {this.createPuzzleCharts(puzzle)}
                </div>)}
            </div>
        </>;
    }
}

render(<Root/>, document.getElementById("root"));
