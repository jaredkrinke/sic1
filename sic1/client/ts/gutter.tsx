import { Component, ComponentChild, createRef } from "preact";

export interface GutterProperties {
    hasStarted: boolean;
    sourceLines: string[];
    currentSourceLine: number;
    sourceLineToBreakpointState: { [lineNumber: number]: boolean | undefined };
    onToggleBreakpoint: (lineNumber: number) => void;
}

export class Gutter extends Component<GutterProperties> {
    private currentSourceLineElement = createRef<HTMLSpanElement>();

    private constructor(props) {
        super(props);
        this.state = { focused: false };
    }

    public render(): ComponentChild {
        return <div className="gutter">
            {this.props.hasStarted
                ? (this.props.sourceLines.map((s, index) =>
                    <>
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
                                        if (!event.ctrlKey && event.key === "Enter") {
                                            this.props.onToggleBreakpoint(index);
                                            event.preventDefault();
                                            event.stopPropagation();
                                        }
                                    }}
                                >●</span>
                            : <>&nbsp;</>
                        }
                        <br/>
                    </>))
                : <>&nbsp;</>}
        </div>;
    }
}