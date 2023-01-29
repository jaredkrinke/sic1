import { render, Component, ComponentChildren, createRef } from "preact";
import { Puzzle, puzzleFlatArray } from "../shared/puzzles";
import { sortAndNormalizeHistogramData } from "../client/ts/service";
import { Chart } from "../client/ts/chart";
import * as statsCaches from "../client/ts/stats-cache";
import * as statsCachedOld from "../client/ts/stats-cache-old";
import { HistogramData } from "../server/contract/dist";
import { ChartData } from "../client/ts/chart-model";

function toChartData(data: HistogramData, bucketCount: number, removeOutliers: boolean): ChartData {
    return {
        histogram: sortAndNormalizeHistogramData(data, bucketCount, undefined, removeOutliers),
    };
}

function capitalize(text: string): string {
    return text.substring(0, 1).toLocaleUpperCase() + text.substring(1);
}

function Checkbox(props: { label: string, onChange: (checked: boolean) => void, isChecked: boolean }) {
    return <label><input type="checkbox" onChange={event => props.onChange(event.currentTarget.checked)} checked={props.isChecked} />{this.props.label}</label>;
}

class Root extends Component<{}, { web: boolean, steam: boolean, outliers: boolean, tiny: boolean, old: boolean }> {
    constructor(props) {
        super(props);
        this.state = {
            web: true,
            steam: true,
            outliers: false,
            tiny: false,
            old: false,
        };
    }

    private getCaches() {
        console.log(`Old: ${this.state.old}`)
        return this.state.old ? statsCachedOld : statsCaches;
    }

    private createPuzzleCharts(puzzle: Puzzle): ComponentChildren {
        return <div className="charts">
            {[
                ["Cycles Executed", "cyclesExecutedBySolution"],
                ["Bytes Read", "memoryBytesAccessedBySolution"],
            ].map(([label, property]) => 
                <Chart key={JSON.stringify(this.state)} title={label} promise={Promise.resolve(toChartData([].concat(
                    this.state.web ? this.getCaches().webStatsCache.puzzleStats[puzzle.title][property] : [],
                    this.state.steam ? this.getCaches().steamStatsCache.puzzleStats[puzzle.title][property] : [],
                ), 20, !this.state.outliers))} />
            )}
        </div>;
    }

    public componentDidUpdate(previousProps: Readonly<{}>, previousState: Readonly<{ web: boolean; steam: boolean; tiny: boolean; }>, snapshot: any): void {
        if (previousState.tiny !== this.state.tiny) {
            document.getElementById("_stats").style.setProperty("font-size", this.state.tiny ? "42%" : "100%");
        }
    }

    public render() {
        const createCheckbox = (property: string): ComponentChildren => {
            return <><Checkbox label={capitalize(property)} onChange={checked => this.setState({ [property]: checked })} isChecked={this.state[property]}/><br/></>;
        };

        return <>
            <div id="_controls">
                {Object.keys(this.state).map(k => createCheckbox(k))}
            </div>
            <div id="_stats">
                <div>
                    <h3>Users</h3>
                    <div className="charts">
                        <Chart key={`Completed Tasks ${JSON.stringify(this.state)}`} title={`Completed Tasks`} promise={Promise.resolve(toChartData([].concat(
                            this.state.web ? this.getCaches().webStatsCache.userStats.solutionsByUser : [],
                            this.state.steam ? this.getCaches().steamStatsCache.userStats.solutionsByUser : [],
                        ), 30, false))} />
                    </div>
                </div>
                {puzzleFlatArray
                    .map(puzzle => <div>
                    <h3>{puzzle.title}</h3>
                    {this.createPuzzleCharts(puzzle)}
                </div>)}
            </div>
        </>;
    }
}

render(<Root/>, document.getElementById("root"));
