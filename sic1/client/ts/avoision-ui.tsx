import { Component, ComponentChild, createRef } from "preact";
import { Avoision } from "./avoision";
import { Button } from "./button";
import { Sic1DataManager } from "./data-manager";

export class AvoisionUI extends Component<{}> {
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
            <Avoision
                ref={this.avoision}
                initialWidthInPixels={sizeInPixels}
                initialHeightInPixels={sizeInPixels}
                onPointsUpdated={points => { this.points.current.innerText = `${points}`; }}
                onScoreUpdated={score => { this.score.current.innerText = `${score}`; }}
                />
            <Button onClick={() => {
                this.avoision.current.reset();
                this.avoision.current.focus();
            }}>Restart</Button>
        </>;
    }
}
