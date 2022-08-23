import { render, Component, ComponentChildren } from "preact";
import { Puzzle, puzzles as puzzleGroups } from "sic1-shared";
import { Sic1Service } from "../client/ts/service";
import { Sic1DataManager } from "../client/ts/data-manager";
import { Chart } from "../client/ts/chart";

class Stats extends Component<{ puzzles: Puzzle[] }> {
    constructor(props) {
        super(props);
    }

    private createPuzzleCharts(puzzle: Puzzle): ComponentChildren {
        const cycles = 100;
        const bytes = 50;
        const promise = Sic1Service.getPuzzleStatsAsync(puzzle.title, cycles, bytes);

        return <div className="charts">
            <Chart title={`Cycles Executed: ${cycles}`} promise={(async () => (await promise).cycles)()} />
            <Chart title={`Bytes Read: ${bytes}`} promise={(async () => (await promise).bytes)()} />
        </div>;
    }

    public render() {
        return <>
            <div>
                <h3>Users</h3>
                <div className="charts">
                    <Chart title={`Completed Tasks`} promise={Sic1Service.getUserStatsAsync(Sic1DataManager.getData().userId)} />
                </div>
            </div>
            {this.props.puzzles.map(puzzle => <div>
                <h3>{puzzle.title}</h3>
                {this.createPuzzleCharts(puzzle)}
            </div>)}
        </>;
    }
}

render(<Stats puzzles={[].concat(...puzzleGroups.map(group => group.list)).slice(0, 10)} />, document.getElementById("_stats"));
