import * as Contract from "sic1-server-contract";

export type HistogramBucketDetails = {
    value: number;
    count: number;
}[];

export type HistogramDetail = (Contract.HistogramDataBucket & {
    details: HistogramBucketDetails;
})[];

export interface ChartData {
    histogram: HistogramDetail;
    highlightedValue?: number;
}
