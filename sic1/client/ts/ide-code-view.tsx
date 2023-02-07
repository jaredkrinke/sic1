import { Component, ComponentChild, createRef } from "preact";
import { Gutter } from "./ide-gutter";
import { ClientPuzzle } from "./puzzles";

export interface Sic1CodeViewProps {
    puzzle: ClientPuzzle;
    solutionName: string;
    defaultCode: string;

    hasStarted: boolean;
    sourceLines: string[];
    sourceLineToBreakpointState: { [lineNumber: number]: boolean };
    currentAddress: number | null;
    currentSourceLine?: number;

    onSave: () => void;
    onToggleBreakpoint: (lineNumber: number) => void;
}

export class Sic1CodeView extends Component<Sic1CodeViewProps> {
    private static readonly initialCommentPattern = /^\s*;\s?/;

    private inputCode = createRef<HTMLTextAreaElement>();
    private gutter = createRef<Gutter>();
    private lastAddress?: number;
    private keyboardSequenceStarted = false;

    private manipulateSelectedLines(manipulate: (line: string) => string): void {
        const textArea = this.inputCode.current;
        if (textArea) {
            // Find the beginning and end
            const { selectionStart, selectionEnd, value } = textArea;
            if (value.length > 0 && selectionStart >= 0 && selectionEnd >= 0) {
                const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
                let lineEnd = (selectionStart === selectionEnd)
                    ? value.indexOf("\n", selectionEnd)
                    : value.indexOf("\n", selectionEnd - 1); // -1 in case cursor is at the beginning of a line (we don't want to comment the "unselected" line)

                if (lineEnd < 0) {
                    lineEnd = value.length;
                }

                // Apply the transformation line-by-line
                const updatedSelection = value
                    .substring(lineStart, lineEnd)
                    .split("\n")
                    .map(line => manipulate(line))
                    .join("\n")
                ;
    
                // Update the region
                textArea.setRangeText(updatedSelection, lineStart, lineEnd);
            }
        }
    }

    public reset(): void {
        this.lastAddress = undefined;
    }

    public focus(): void {
        this.inputCode.current?.focus?.();
    }

    public getCode(): string {
        return this.inputCode.current?.value;
    }

    public selectLine(sourceLineNumber: number, content: string): void {
        const textArea = this.inputCode.current
        if (textArea) {
            const code = textArea.value;
            let position = 0;
            let line = 1;
            while (line < sourceLineNumber && position >= 0 && position < code.length) {
                position = code.indexOf("\n", position) + 1;
                ++line;
            }

            textArea.setSelectionRange(position, position + content.length);
        }
    }

    private blockComment(): void {
        this.manipulateSelectedLines(line => "; " + line);
    }

    private blockUncomment(): void {
        this.manipulateSelectedLines(line => line.replace(Sic1CodeView.initialCommentPattern, ""));
    }

    public componentDidUpdate() {
        if (this.lastAddress !== this.props.currentAddress && this.gutter.current) {
            this.gutter.current.scrollCurrentSourceLineIntoView();
            this.lastAddress = this.props.currentAddress;
        }
    }

    public render(): ComponentChild {
        return <div className="program">
            <Gutter
                ref={this.gutter}
                hasStarted={this.props.hasStarted}
                currentSourceLine={this.props.currentSourceLine}
                sourceLines={this.props.sourceLines}
                sourceLineToBreakpointState={this.props.sourceLineToBreakpointState}
                onToggleBreakpoint={(lineNumber) => this.props.onToggleBreakpoint(lineNumber)}
                />
            <textarea
                ref={this.inputCode}
                className={"input" + (this.props.hasStarted ? " hidden" : "")}
                spellcheck={false}
                wrap="off"
                defaultValue={this.props.defaultCode}
                onBlur={(e) => {
                    // Work around onBlur apparently being called on unmount...
                    if (this.inputCode.current) {
                        this.props.onSave();
                    }

                    this.keyboardSequenceStarted = false;
                }}
                onKeyDown={(event) => {
                    if (event.ctrlKey) {
                        if (this.keyboardSequenceStarted) {
                            switch (event.key) {
                                case "c":
                                    this.blockComment();
                                    event.preventDefault();
                                    break;

                                case "u":
                                    this.blockUncomment();
                                    event.preventDefault();
                                    break;
                            }

                            this.keyboardSequenceStarted = false;
                        } else {
                            if (event.key === "k") {
                                // Ctrl+K starts a keyboard shortcut sequence
                                this.keyboardSequenceStarted = true;
                                event.preventDefault();
                            }
                        }
                    }
                }}
                ></textarea>
            <div className={"source" + (this.props.hasStarted ? "" : " hidden")}>
                {
                    this.props.sourceLines.map((line, index) => {
                        if (/\S/.test(line)) {
                            const currentLine = (index === this.props.currentSourceLine);
                            return currentLine
                                ? <div className="emphasize">{line}</div>
                                : <div>{line}</div>;
                        } else {
                            return <br />
                        }
                    })
                }
            </div>
        </div>
        ;
    }
}
