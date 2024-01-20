import React from "react";
import { Sic1DataManager } from "./data-manager";
import { FriendLeaderboardEntry } from "./service";

enum State {
    loading,
    loaded,
    loadFailed,
}

interface FriendLeaderboardProperties {
    title: React.ReactNode;
    promise: Promise<FriendLeaderboardEntry[]>;
}

interface FriendLeaderboardState {
    state: State;
    data?: FriendLeaderboardEntry[];
}

export class FriendLeaderboard extends React.Component<FriendLeaderboardProperties, FriendLeaderboardState> {
    constructor(props: FriendLeaderboardProperties) {
        super(props);
        this.state = { state: State.loading };
    }

    public async componentDidMount() {
        try {
            const data = await this.props.promise;
            this.setState({
                state: State.loaded,
                data,
            });
        } catch (error) {
            this.setState({ state: State.loadFailed });
        }
    }

    public render() {
        let body: React.ReactNode = null;
        switch (this.state.state) {
            case State.loading:
                body = <tr><td colSpan={2} className="center">Loading...</td></tr>
                break;

            case State.loaded:
                if (this.state.data!.length > 0) {
                    body = this.state.data!.map((row, index) => <tr key={index}>
                        <td className={"text" + ((row.name === Sic1DataManager.getData().name) ? "" : " deemphasize")}>{row.name}</td>
                        <td>{row.score}</td>
                    </tr>);
                } else {
                    body = <tr><td colSpan={2} className="center">(empty)</td></tr>
                }
                break;

            case State.loadFailed:
                body = <tr><td colSpan={2} className="center">Load Failed</td></tr>
                break;
        }

        return <table className="stats">
            <thead><tr><th colSpan={2}>{this.props.title}</th></tr></thead>
            <tbody>{body}</tbody>
        </table>;
    }
}
