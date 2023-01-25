import { ChartData, HistogramBucketDetail } from "./chart-model";
import { Component, ComponentChildren } from "preact";

export enum ChartState {
    loading,
    loaded,
    loadFailed,
}

interface ChartProperties {
    title: string;
    promise: Promise<ChartData>;
}

interface ChartComponentState {
    chartState: ChartState;
    data?: ChartData;
}

function formatDetail(detail: HistogramBucketDetail): string {
    const { value, count } = detail;
    return `Score: ${value}, count: ${count}`;
}

function limitLines(lines: string[], maxLines: number): string[] {
    if (lines.length > maxLines) {
        return [
            ...lines.slice(0, maxLines - 2),
            "...",
            lines[lines.length - 1],
        ];
    } else {
        return lines;
    }
}

function formatDetails(details: HistogramBucketDetail[], outliers?: HistogramBucketDetail[]): string {
    const scoreLines = limitLines(details.map(detail => formatDetail(detail)), 7);
    const outlierLines = limitLines(outliers ? ["", "Outliers:", ...outliers.map(detail => formatDetail(detail))] : [], 5);

    return scoreLines
        .concat(...outlierLines)
        .join("\n")
    ;
}

export class Chart extends Component<ChartProperties, ChartComponentState> {
    constructor(props: ChartProperties) {
        super(props);
        this.state = { chartState: ChartState.loading };
    }

    public async componentDidMount() {
        try {
            this.setState({
                chartState: ChartState.loaded,
                data: await this.props.promise,
            });
        } catch (error) {
            this.setState({ chartState: ChartState.loadFailed });
        }
    }

    public render() {
        let body: ComponentChildren;
        if (this.state.chartState === ChartState.loaded) {
            // Find bucket to highlight, max count, and min/max values
            const outliers = this.state.data.histogram.outliers ?? [];
            const data = this.state.data.histogram.buckets;
            const highlightedValue = this.state.data.highlightedValue;
            let maxCount = 1;
            let minValue = null;
            let maxValue = null;
            let highlightIndex: number | null = null;
            for (let i = 0; i < data.length; i++) {
                const bucket = data[i];
                maxCount = Math.max(maxCount, bucket.count);
                maxValue = bucket.bucketMax;
                if (minValue === null) {
                    minValue = bucket.bucketMax;
                }

                if (bucket.bucketMax <= highlightedValue) {
                    highlightIndex = i;
                }
            }

            if (highlightedValue > 0 && highlightIndex !== null && data[highlightIndex].count <= 0) {
                data[highlightIndex].count = 1;
            }

            const chartHeight = 20;
            const scale = chartHeight / maxCount;
            let points = "";
            for (let i = 0; i < data.length; i++) {
                const count = data[i].count;
                points += ` ${i * 20 / data.length},${chartHeight - (count * scale)}`;
                points += ` ${(i + 1) * 20 / data.length},${chartHeight - (count * scale)}`;
            }

            body = <>
                <polyline className="chartLine" points={points}></polyline>
                {highlightIndex === null ? null : <rect className="chartHighlight" x={highlightIndex * 20 / data.length} y={chartHeight - (data[highlightIndex].count * scale)} width={20 / data.length} height={data[highlightIndex].count * scale}></rect>}
                {highlightIndex === null ? null : <polyline className="chartArrow" points="0,-0.5 0.5,0 1,-0.5 0,-0.5" transform={`translate(${highlightIndex * 20 / data.length}, ${chartHeight - (data[highlightIndex].count * scale + 0.5)}) scale(${20 / data.length})`}></polyline>}
                {data.map(({ bucketMax, count, details }, i) => <rect className="chartInvisible" x={i * 20 / data.length} y={chartHeight - Math.max(1, (count * scale))} width={20 / data.length} height={Math.max(1, (count * scale))}>
                    <title>{formatDetails(details, (i === data.length - 1) ? outliers : undefined)}</title>
                </rect>)}
                <text className="chartLeft" x="0" y="21.5">{minValue}</text>
                <text className="chartRight" x="20" y="21.5">{maxValue}</text>
            </>;

        } else {
            body = <>
                <text className="chartOverlay" x="10" y="10">{(this.state.chartState === ChartState.loading) ? "Loading..." : "Load Failed"}</text>
            </>;
        }

        return <svg className="chart" viewBox="0 -3 20 25">
            <rect x="0" y="-3" width="20" height="1.6"></rect>
            <line x1="0" y1="20" x2="20" y2="20"></line>
            <text className="chartTitle" x="10" y="-1.9">{this.props.title}</text>
            {body}
        </svg>;
    }
}
