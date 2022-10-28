import { Component, ComponentChild, createRef } from "preact";
import { Avoision } from "./avoision";
import { Sic1DataManager } from "./data-manager";
import { Platform } from "./platform";
import { Shared } from "./shared";
import { SoundEffects } from "./sound-effects";

interface AvoisionUIState {
    message?: string;
    points?: number;
    score?: number;
    saved: boolean;
}

export class AvoisionUI extends Component<{}, AvoisionUIState> {
    private static highScoreCount = 3;

    private avoision = createRef<Avoision>();

    public constructor(props) {
        super(props);
        this.state = { saved: false };
    }

    /** Returns true if this was a new high score. */
    private saveScoreIfNeeded(score: number): boolean {
        if (score > 0) {
            const { scores } = Sic1DataManager.getAvoisionData();
            const index = scores.findIndex(s => (s < score));
            if (index >= 0) {
                scores.splice(index, 0, score);
                if (scores.length > AvoisionUI.highScoreCount) {
                    scores.length = AvoisionUI.highScoreCount;
                }
            } else if (scores.length < AvoisionUI.highScoreCount) {
                scores.push(score);
            }
    
            Sic1DataManager.saveAvoisionData();

            const newHighScore = (index === 0) || (scores.length === 1);

            // Update Steam friend leaderboard, if needed
            if (newHighScore && Platform.service.tryUpdateFriendLeaderboardAsync) {
                Shared.ignoreRejection(Platform.service.tryUpdateFriendLeaderboardAsync("Avoision", score));
            }

            return newHighScore;
        }
        return false;
    }

    public componentWillUnmount(): void {
        if (this.state.score && !this.state.saved) {
            this.saveScoreIfNeeded(this.state.score);
        }
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
                        SoundEffects.play("avoisionGameOver");
                    }}
                    />
            </div>
        </>;
    }
}
