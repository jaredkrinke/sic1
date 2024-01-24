import React from "react";
import { Shared } from "./shared";

export interface GutterProperties {
    hasStarted: boolean;
    sourceLines: string[];
    initialLineCount: number;
    currentSourceLine: number;
    sourceLineToBreakpointState: { [lineNumber: number]: boolean | undefined };
    onToggleBreakpoint: (lineNumber: number) => void;
}

interface GutterState {
    lineCount: number;
}

export class Gutter extends React.Component<GutterProperties, GutterState> {
    private currentSourceLineElement = React.createRef<HTMLSpanElement>();

    constructor(props: GutterProperties) {
        super(props);
        this.state = { lineCount: props.initialLineCount };
    }

    public setLineCount(lineCount): void {
        this.setState({ lineCount });
    }

    public scrollCurrentSourceLineIntoView(): void {
        Shared.scrollElementIntoView(this.currentSourceLineElement.current);
    }

    public render(): React.ReactNode {
        return <>
            <div className="gutter">
                {this.props.hasStarted
                    ? (this.props.sourceLines.map((s, index) =>
                        <React.Fragment key={index}>
                            {(this.props.sourceLineToBreakpointState[index] !== undefined)
                                ?
                                    <span
                                        ref={(index === this.props.currentSourceLine) ? this.currentSourceLineElement : undefined}
                                        className={`breakpoint${this.props.sourceLineToBreakpointState[index] ? "" : " off"}`}
                                        tabIndex={0}
                                        onMouseDown={(event) => {
                                            this.props.onToggleBreakpoint(index);

                                            // Don't focus if we're just toggling the breakpoint (the outline is ugly)
                                            event.preventDefault();
                                        }}
                                        onKeyDown={(event) => {
                                            if (!event.ctrlKey && !event.metaKey && event.key === "Enter") {
                                                this.props.onToggleBreakpoint(index);
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }
                                        }}
                                    >●</span>
                                : <>&nbsp;</>
                            }
                            <br/>
                        </React.Fragment>))
                    : <>&nbsp;</>}
            </div>
            <div className="gutter deemphasize alignRight">
                {Array.from(Array(this.state.lineCount)).map((_, index) => <React.Fragment key={index}>
                    {index + 1}
                    &nbsp;
                    <br/>
                </React.Fragment>)}
            </div>
        </>;
    }
}