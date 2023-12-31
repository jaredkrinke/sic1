import React from "react";
import { Chart, ChartState } from "./chart";
import { ChartData } from "./chart-model";
import { FriendLeaderboard } from "./friend-leaderboard";
import { Platform } from "./platform";
import { Sic1SteamService } from "./service";
import { FormattedMessage } from "react-intl";

interface Sic1UserStatsState {
    chartState: ChartState;
    data?: ChartData;
}

export class Sic1UserStats extends React.Component<{ promise: Promise<ChartData> }, Sic1UserStatsState> {
    constructor(props) {
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
        // Calculate rank
        let count = 0;
        let worse = 0;
        if (this.state.data) {
            const histogram = this.state.data.histogram.buckets;
            const highlightedValue = this.state.data.highlightedValue;
            for (let i = 0; i < histogram.length; i++) {
                const bucket = histogram[i];
                count += bucket.count;

                if (bucket.bucketMax <= highlightedValue) {
                    worse += bucket.count;
                }
            }
        }

        const rank = Math.min(count, count - (worse - 1));

        return <>
            <p>
                <FormattedMessage
                    id="rank"
                    description="Current ranking of the player"
                    defaultMessage="Rank: {ranking}"
                    values={{ ranking: this.state.data
                        ? <FormattedMessage
                            id="rankOutOf"
                            description="Actual ranking value (out of total)"
                            defaultMessage="{rank} out of {total}"
                            values={{
                                rank,
                                total: count,
                            }}
                            />
                        : <FormattedMessage
                            id="rankLoading"
                            description="Text to show while rank is loading"
                            defaultMessage="(loading...)"
                            />}}
                    />
            </p>
            <div className="charts">
                <Chart
                    title={<FormattedMessage
                        id="chartTitleTasks"
                        description="Title for the 'tasks completed' chart"
                        defaultMessage="Completed Tasks"
                        />}
                    promise={this.props.promise} />
                {Platform.service.getFriendLeaderboardAsync
                ? <>
                    <br/>
                    <FriendLeaderboard
                        title={<FormattedMessage
                            id="chartFriendTasks"
                            description="Title of friend leaderboard chart for 'tasks completed'"
                            defaultMessage="Completed Tasks (Friends)"
                            />}
                        promise={Platform.service.getFriendLeaderboardAsync(Sic1SteamService.solvedCountLeaderboardName)} />
                </>
                : null
            }
            </div>
        </>;
    }
}
