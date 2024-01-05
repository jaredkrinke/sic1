import React from "react";
import { Avoision } from "./avoision";
import { ColorScheme } from "./colors";
import { Sic1DataManager } from "./data-manager";
import { Music } from "./music";
import { Platform } from "./platform";
import { SoundEffects } from "./sound-effects";
import { FormattedMessage } from "react-intl";

interface AvoisionUIProps {
    colorScheme: ColorScheme;
    onClosed: () => void;
    onAchievement: () => void;
}

interface AvoisionUIState {
    message?: React.ReactNode;
    points?: number;
    score?: number;
    saved: boolean;
}

export class AvoisionUI extends React.Component<AvoisionUIProps, AvoisionUIState> {
    private static readonly achievementScore = 250;

    private avoision = React.createRef<Avoision>();

    public constructor(props) {
        super(props);
        this.state = { saved: false };
    }

    /** Returns true if this was a new high score. */
    private saveScoreIfNeeded(score: number): boolean {
        if (score > 0) {
            const data = Sic1DataManager.getAvoisionData();
            if (!data.score || score > data.score) {
                data.score = score;                
                Sic1DataManager.saveAvoisionData();

                // Update Steam friend leaderboard, if needed
                if (Platform.service.tryUpdateFriendLeaderboardAsync) {
                    Platform.service.tryUpdateFriendLeaderboardAsync("Avoision", score);
                }

                if (score >= AvoisionUI.achievementScore) {
                    this.props.onAchievement();
                }

                return true;
            }
        }
        return false;
    }

    public componentWillUnmount(): void {
        if (this.state.score && !this.state.saved) {
            this.saveScoreIfNeeded(this.state.score);
        }

        this.props.onClosed();
    }

    public render(): React.ReactNode {
        return <>
            <div className="avoisionHeader">
                <div className="avoisionPoints">
                    <FormattedMessage
                        id="avoisionPoints"
                        description="In-game display of points for Avoision"
                        defaultMessage="Points: {value}"
                        values={{ value: (this.state.points !== undefined) ? `${this.state.points}` : "" }}
                        />
                </div>
                <div className="avoisionScore">
                    <FormattedMessage
                        id="avoisionScore"
                        description="In-game display of score for Avoision"
                        defaultMessage="Score: {value}"
                        values={{ value: (this.state.score !== undefined) ? `${this.state.score}` : "" }}
                        />
                </div>
            </div>
            <div className="avoisionBox">
                {this.state.message ? <p className="avoisionOverlay fadeIn">{this.state.message}</p> : null}
                <Avoision
                    ref={this.avoision}
                    colorScheme={this.props.colorScheme}
                    onStarted={() => Music.play("avoision")}
                    onPointsUpdated={points => this.setState({ points })}

                    onScoreUpdated={score => {
                        this.setState({ score, saved: false });
                        if (score > 0) {
                            SoundEffects.play("avoisionScore");
                        }
                    }}

                    onGameOver={score => {
                        const newHighScore = this.saveScoreIfNeeded(score);
                        this.setState({
                            score,
                            saved: true,
                            message: newHighScore
                                ? <FormattedMessage
                                    id="avoisionNewHigh"
                                    description="Message shown when a new high score is achieved in Avoision"
                                    defaultMessage="New High Score!"
                                    />
                                : <FormattedMessage
                                    id="avoisionGameOver"
                                    description="Message shown when a round of Avoision ends without a new high score"
                                    defaultMessage="Game Over"
                                    />,
                        });
                        Music.pause();
                        SoundEffects.play("avoisionGameOver");
                    }}
                    />
            </div>
        </>;
    }
}
