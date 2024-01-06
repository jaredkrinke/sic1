import React from "react";
import { Timer } from "./timer";
import { IntlShape } from "react-intl";

interface BootScreenState {
    text: string;
    dotCounter: number | null;
    memoryPrefix?: string;
    memoryCounter: number | null;
    cursorCounter: number;
    cursorVisible: boolean;
}

function padNumber(n: number, digits: number, pad: string): string {
    const str = n.toString();
    if (str.length < digits) {
        return pad.repeat(digits - str.length) + str;
    }
    return str;
}

export class GlobalKeyboardShortcut extends React.Component<{ onKeyDown: (event: KeyboardEvent) => void }> {
    // Note: Store this function here because this.props.onKeyDown can change between componentDidMount and componentWillUnmount!
    private onKeyDown: (event: KeyboardEvent) => void;

    constructor(props) {
        super(props);
        this.onKeyDown = this.props.onKeyDown;
    }

    public componentDidMount(): void {
        window.addEventListener("keydown", this.onKeyDown);
    }

    public componentWillUnmount(): void {
        window.removeEventListener("keydown", this.onKeyDown);
    }

    public render() {
        return <></>;
    }
}

interface BootScreenProps {
    intl: IntlShape;
    onCompleted: () => void;
}

export class BootScreen extends React.Component<BootScreenProps, BootScreenState> {
    private static bootTimeoutInMS = 4000;
    private static framePeriodInMS = 1000 / 30;
    private static ticksPerFrame = 12;
    private static ticksPerDot = 24;
    private static cursorBlinkPeriodInFrames = 6;

    private session: string;
    private initialSession: string;
    private intervalToken?: number;

    constructor(props) {
        super(props);
        this.session = this.props.intl.formatMessage({
            id: "bootMessage",
            description: "Text of the boot screen, shown when launching the game; notes: use spaces for alignment, the '█' character is used for an ASCII art logo, and '...' and '###/256B ' have special meaning and should be preserved",
            defaultMessage:
`
 ████  █████   ████
██       █    ██
 ███     █    █      SYSTEMS (TM)
   ██    █    ██
████   █████   ████

     "Synergy, simply."

(C) 1980 SIC Systems, Inc.

SIC-1 emulator - 50 Hz          ... OK
Checking SIC-1 memory      ###/256B OK
Simulating SIC-1 8-bit I/O port ... OK

Loading SIC-1 Development Environment v120279...

Starting hi-res, tri-color graphical session... `
        });

        this.initialSession = BootScreen.getInitialText(this.session);
        this.state = {
            text: "",
            dotCounter: null,
            memoryCounter: null,
            cursorCounter: 0,
            cursorVisible: false,
        };
    }

    private frame(): void {
        this.setState((oldState) => {
            const state = { ...oldState };
            for (let i = 0; i < BootScreen.ticksPerFrame && state.text.length < this.initialSession.length; i++) {
                if (state.dotCounter !== null) {
                    state.dotCounter += 1;
                    if ((state.dotCounter % BootScreen.ticksPerDot) === 0) {
                        if (state.text.substring(state.text.length - 3) === "...") {
                            state.dotCounter = null;
                        } else {
                            state.dotCounter = 0;
                            state.text += ".";
                        }
                    }
                } else if (state.memoryCounter !== null) {
                    state.text = state.memoryPrefix + `${padNumber(state.memoryCounter, 3, " ")}/256B `;
                    if (state.memoryCounter >= 256) {
                        state.memoryCounter = null;
                    } else {
                        state.memoryCounter += 8;
                    }
                    break; // Only update once per frame
                } else {
                    // Skip newlines
                    while (this.session[state.text.length] === "\n") {
                        state.text += "\n";
                    }

                    const position = state.text.length;
                    if (this.session.substring(position, position + 3) === "...") {
                        state.dotCounter = 0;
                    } else if (this.session.substring(position, position + 9) === "###/256B ") {
                        state.memoryPrefix = state.text;
                        state.memoryCounter = 0;
                        state.text += "  0/256B ";
                    } else {
                        state.text += this.session[position];
                    }
                }
            }

            if (state.cursorCounter === BootScreen.cursorBlinkPeriodInFrames) {
                state.cursorVisible = !state.cursorVisible;
                state.cursorCounter = 0;
            }
            state.cursorCounter += 1;

            return state;
        });
    }

    private static getInitialText(session: string): string {
        return session.replace(/[^\n]/g, " ");
    }

    public componentDidMount(): void {
        this.intervalToken = setInterval(() => this.frame(), BootScreen.framePeriodInMS);
    }

    public componentWillUnmount(): void {
        if (this.intervalToken !== undefined) {
            clearInterval(this.intervalToken);
            this.intervalToken = undefined;
        }
    }

    public render() {
        const { text, cursorVisible } = this.state;
        return <>
            <Timer timerInMS={BootScreen.bootTimeoutInMS} onTimerCompleted={this.props.onCompleted} />
            <GlobalKeyboardShortcut onKeyDown={(event) => {
                if (event.key === "Escape") {
                    this.props.onCompleted();
                }
            }} />
            <div className="centerContainer">
                <div className="bootScreen" onDoubleClick={this.props.onCompleted}>
                    <pre>{text.substring(0, text.length - 1)}{cursorVisible ? "█" : text.substring(text.length - 1, text.length)}{this.initialSession.substring(text.length)}</pre>
                </div>
            </div>
        </>;
    }
}

