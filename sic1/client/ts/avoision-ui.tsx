import { Component, ComponentChild, createRef } from "preact";
import { Avoision } from "./avoision";
import { Sic1DataManager } from "./data-manager";
import { Music } from "./music";
import { Platform } from "./platform";
import { Shared } from "./shared";
import { SoundEffects } from "./sound-effects";

interface AvoisionUIProps {
    onClosed: () => void;
    onAchievement: () => void;
}

interface AvoisionUIState {
    message?: string;
    points?: number;
    score?: number;
    saved: boolean;
}

export class AvoisionUI extends Component<AvoisionUIProps, AvoisionUIState> {
    private static readonly achievementScore = 250;

    private avoision = createRef<Avoision>();

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

    public render(): ComponentChild {
        return <>
            <div className="avoisionHeader">
                <div className="avoisionPoints">Points: {(this.state.points !== undefined) ? `${this.state.points}` : "" }</div>
                <div className="avoisionScore">Score: {(this.state.score !== undefined) ? `${this.state.score}` : "" }</div>
            </div>
            <div className="avoisionBox">
                {this.state.message ? <p className="avoisionOverlay fadeIn">{this.state.message}</p> : null}
                <Avoision
                    ref={this.avoision}
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
                            message: newHighScore ? "New High Score!" : "Game Over",
                        });
                        Music.pause();
                        SoundEffects.play("avoisionGameOver");
                    }}
                    />
            </div>
        </>;
    }
}
