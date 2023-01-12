import * as Contract from "sic1-server-contract";

export interface ChartData {
    histogram: Contract.HistogramData;
    highlightedValue?: number;
}
