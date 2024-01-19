import React from "react";
import { Gutter } from "./ide-gutter";
import { ClientPuzzle } from "./puzzles";

export interface Sic1CodeViewProps {
    puzzle: ClientPuzzle;
    solutionName: string;
    defaultCode: string;

    autoIndentMode: boolean;
    tabInsertMode: boolean;

    hasStarted: boolean;
    sourceLines: string[];
    sourceLineToBreakpointState: { [lineNumber: number]: boolean };
    currentAddress: number | null;
    currentSourceLine?: number;

    onSave: () => void;
    onToggleBreakpoint: (lineNumber: number) => void;
    onToggleTabInsertMode: () => void;
}

interface Sic1CodeViewUpdateSnapshot {
    scrollTop?: number;
    scrollLeft?: number;
}

export class Sic1CodeView extends React.Component<Sic1CodeViewProps> {
    private static readonly initialCommentPattern = /^\s*;\s?/;
    private static readonly initialIndentPattern = /^(\t|    )/;
    private static readonly indentPattern = /^\s*/;

    private inputCode = React.createRef<HTMLTextAreaElement>();
    private gutter = React.createRef<Gutter>();
    private div = React.createRef<HTMLDivElement>();
    private lastAddress?: number;
    private keyboardSequenceStarted = false;
    private hadFocusPriorToDebugging = false;
    private focusOnUpdate = false;

    constructor(props) {
        super(props);
    }

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
                const lines = value.substring(lineStart, lineEnd).split("\n");
                const updatedSelection = lines.map(line => manipulate(line)).join("\n");

                // Move focus to the text area to ensure selection works even when activated via an external button
                const previousFocus = document.activeElement;
                if (previousFocus !== textArea) {
                    textArea.focus();
                }

                // Update the region
                const cursorAtStart = (selectionStart === selectionEnd) && lines.length === 1;
                textArea.setRangeText(updatedSelection, lineStart, lineEnd, cursorAtStart ? "start" : "preserve");

                if (previousFocus !== textArea) {
                    previousFocus?.["focus"]?.();
                }
            }
        }
    }

    public reset(): void {
        this.lastAddress = undefined;
    }

    public focusIfNeeded(): void {
        if (this.props.hasStarted) {
            // Currently debugging; queue a focus update, if needed
            if (this.hadFocusPriorToDebugging) {
                this.focusOnUpdate = true;
            }
        } else {
            // Currently editing; focus the textarea
            this.inputCode.current?.focus?.();
        }
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

    public blockComment(): void {
        this.manipulateSelectedLines(line => "; " + line);
    }

    public blockUncomment(): void {
        this.manipulateSelectedLines(line => line.replace(Sic1CodeView.initialCommentPattern, ""));
    }

    public indentLines(): void {
        this.manipulateSelectedLines(line => "\t" + line);
    }

    public unindentLines(): void {
        this.manipulateSelectedLines(line => line.replace(Sic1CodeView.initialIndentPattern, ""));
    }

    public getSnapshotBeforeUpdate(previousProps: Readonly<Sic1CodeViewProps>, previousState: Readonly<{}>): Sic1CodeViewUpdateSnapshot {
        if (previousProps.hasStarted !== this.props.hasStarted) {
            // Switched between editing and debugging; preserve scroll position
            const source = (previousProps.hasStarted) ? this.div.current : this.inputCode.current;
            if (source) {
                const { scrollTop, scrollLeft } = source;
                return {
                    scrollTop,
                    scrollLeft,
                }
            }
        }

        return {};
    }

    public componentDidUpdate(previousProps: Readonly<Sic1CodeViewProps>, previousState: Readonly<{}>, snapshot: Sic1CodeViewUpdateSnapshot): void {
        if (this.lastAddress !== this.props.currentAddress && this.gutter.current) {
            if (snapshot.scrollTop === undefined) {
                this.gutter.current.scrollCurrentSourceLineIntoView();
            }

            this.lastAddress = this.props.currentAddress;
        }

        if (snapshot.scrollTop !== undefined) {
            // Switched between editing and debugging; restore scroll position (and focus, if needed)
            if (this.props.hasStarted) {
                this.div.current.scrollTop = snapshot.scrollTop ?? this.div.current.scrollTop;
                this.div.current.scrollLeft = snapshot.scrollLeft ?? this.div.current.scrollLeft;

                // Check to see if textarea was focused, so it can be restored later
                this.hadFocusPriorToDebugging = (document.activeElement === this.inputCode.current);
            } else {
                this.inputCode.current.scrollTop = snapshot.scrollTop ?? this.inputCode.current.scrollTop;
                this.inputCode.current.scrollLeft = snapshot.scrollLeft ?? this.inputCode.current.scrollLeft;

                // No longer debugging; refocus the textarea, if needed
                if (this.focusOnUpdate) {
                    this.inputCode.current.focus();
                    this.focusOnUpdate = false;
                }
            }
        }
    }

    public render(): React.ReactNode {
        return <div ref={this.div} className="program">
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
                spellCheck={false}
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
                    if (event.ctrlKey || event.metaKey) {
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
                            switch (event.key) {
                                case "k":
                                    // Ctrl+K starts a keyboard shortcut sequence
                                    this.keyboardSequenceStarted = true;
                                    event.preventDefault();
                                    break;                                
                                
                                case "m":
                                    // Ctrl+M toggles tab capture
                                    this.props.onToggleTabInsertMode();
                                    event.preventDefault();
                                    break;
                            }
                        }
                    } else if (event.key === "Tab") {
                        const textArea = this.inputCode.current;
                        if (this.props.tabInsertMode && textArea) {
                            if (event.shiftKey) {
                                // Shift+Tab to un-indent
                                this.unindentLines();
                            } else {
                                const { selectionStart, selectionEnd } = textArea;
                                if (selectionStart === selectionEnd) {
                                    // Tab with no selection, not at beginning of line; just insert the tab character
                                    textArea.setRangeText("\t", selectionStart, selectionEnd, "end");
                                } else {
                                    // Tab with selection or beginning of line; indent selected lines
                                    this.indentLines();
                                }
                            }
                            event.preventDefault();
                        }
                    } else if (event.key === "Enter") {
                        const textArea = this.inputCode.current;
                        if (textArea && this.props.autoIndentMode) {
                            const { selectionStart, selectionEnd, value } = textArea;
                            if (selectionStart > 0 && selectionStart === selectionEnd) {
                                const lastNewlineIndex = value.lastIndexOf("\n", selectionStart - 1) + 1;
                                if (lastNewlineIndex > 0) {
                                    const previousLineIndent = Sic1CodeView.indentPattern.exec(value.substring(lastNewlineIndex, selectionStart))?.[0];
                                    if (previousLineIndent) {
                                        textArea.setRangeText("\n" + previousLineIndent, selectionStart, selectionEnd, "end");
                                        event.preventDefault();
                                    }
                                }
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
