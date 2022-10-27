import { Component, ComponentChild, createRef } from "preact";
import { Avoision } from "./avoision";
import { Button } from "./button";
import { Sic1DataManager } from "./data-manager";
import { SoundEffects } from "./sound-effects";

export class AvoisionUI extends Component<{}, { message?: string }> {
    private points = createRef<HTMLSpanElement>();
    private score = createRef<HTMLSpanElement>();
    private avoision = createRef<Avoision>();

    public render(): ComponentChild {
        const sizeInPixels = 600 * Sic1DataManager.getPresentationData().zoom;
        return <>
            <div className="avoisionHeader">
                <div className="avoisionPoints">Points: <span ref={this.points}></span></div>
                <div className="avoisionScore">Score: <span ref={this.score}></span></div>
            </div>
            <div className="avoisionBox">
                {this.state.message ? <p className="avoisionOverlay fadeIn">{this.state.message}</p> : null}
                <Avoision
                    ref={this.avoision}
                    initialWidthInPixels={sizeInPixels}
                    initialHeightInPixels={sizeInPixels}
                    onPointsUpdated={points => { this.points.current.innerText = `${points}`; }}

                    onScoreUpdated={score => {
                        this.score.current.innerText = `${score}`;
                        if (score > 0) {
                            SoundEffects.play("avoisionScore");
                        }
                    }}

                    onGameOver={score => {
                        this.setState({ message: "Game Over" });
                        SoundEffects.play("avoisionGameOver");
                    }}
                    />
            </div>
            <Button onClick={() => {
                this.setState({ message: null });
                this.avoision.current.reset();
                this.avoision.current.focus();
            }}>Restart</Button>
        </>;
    }
}
