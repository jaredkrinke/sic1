import { Assembler, Emulator, CompilationError } from "../../lib-ts/src/sic1asm"
declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

// TODO: User id and persistent state
// TODO: Message box and dimmer
// TODO: Message box escape key
// TODO: Highlighting
// TODO: Puzzle load, including saving of previous puzzle
// TODO: Save puzzle progress
// TODO: Service integration
// TODO: Charts
// TODO: Puzzle list
// TODO: Run/auto-step
// TODO: Welcome/intro
// TODO: User stats/resume
// TODO: Load last open puzzle

// Puzzles
interface Puzzle {
    title: string;
    minimumSolvedToUnlock: number; // TODO: Better approach here?
    description: string;
    code: string;
    io: (number | number[])[][];
}

interface PuzzleGroup {
    groupTitle: string;
    list: Puzzle[];
}

const puzzles: PuzzleGroup[] = [];
puzzles.push({
    groupTitle: "Tutorial",
    list: [
        {
            title: "Subleq Instruction and Output",
            minimumSolvedToUnlock: 0,
            description: "Use subleq and input/output to negate an input and write it out.",
            code:
`; The SIC-1 is an 8-bit computer with 256 bytes of memory.
; Programs are written in SIC-1 Assembly Language.
; Each instruction is 3 bytes, specified as follows:
;
;   subleq <A> <B> [<C>]
;
; A, B, and C are memory addresses (0 - 255) or labels.
;
; \"subleq\" subtracts the value at address B from the
; value at address A and stores the result at address A
; (i.e. mem[A] = mem[A] - mem[B]).
;
; If the result is <= 0, execution branches to address C.
;
; Note that if C is not specified, the address of the next
; instruction is used (in other words, the branch does
; nothing).
;
; For convenience, addresses can be specified using labels.
; The following predefined labels are always available:
;
;   @MAX (252): Maximum user-modifiable address
;   @IN (253): Reads a value from input (writes are ignored)
;   @OUT (254): Writes a result to output (reads as zero)
;   @HALT (255): Terminates the program when executed
;
; Below is a very simple SIC-1 program that negates one input
; value and writes it out.
;
; E.g. if the input value from @IN is 3, it subtracts 3 from
; @OUT (which reads as zero), and the result of 0 - 3 = -3 is
; written out.

subleq @OUT, @IN

; First, click \"Load\" to compile the program and load it
; into memory, then use the \"Step\" and \"Run\" buttons to
; execute the program until all expected outputs have been
; successfully written out (see the.
; \"In\"/\"Expected\"/\"Out\" table to the left).
`
            ,
            io: [
                [3, -3]
            ]
        },
        // TODO: Remaining puzzles
    ],
});

// State management
enum StateFlags {
    none = 0x0,
    running = 0x1,
    error = 0x2,
    done = 0x4,
}

interface Sic1IdeState {
    stateFlags: StateFlags;
    stateLabel: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    sourceLines: string[];

    // Memory
    [index: number]: number;
}

class Sic1Ide extends React.Component<{ puzzle: Puzzle }, Sic1IdeState> {
    private autoStep = false;
    private memoryMap: number[][];
    private programBytes: number[];
    private emulator: Emulator;

    private inputSource = React.createRef<HTMLTextAreaElement>();

    constructor(props) {
        super(props);

        const memoryMap: number[][] = [];
        for (let i = 0; i < 16; i++) {
            let row: number[] = [];
            for (let j = 0; j < 16; j++) {
                row.push(16 * i + j);
            }
            memoryMap.push(row);
        }
        this.memoryMap = memoryMap;


        let state: Sic1IdeState = {
            stateFlags: StateFlags.none,
            stateLabel: "",
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,
            sourceLines: [],
        };

        // Initialize memory
        for (let i = 0; i < 256; i++) {
            state[i] = 0;
        }

        this.state = state;
    }

    private static hexifyByte(v: number): string {
        var str = v.toString(16);
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    }

    private isRunning(): boolean {
        return !!(this.state.stateFlags & StateFlags.running);
    }

    private setStateFlags(update: (oldStateFlags: StateFlags) => StateFlags): void {
        let newStateFlags: StateFlags;
        this.setState(state => ({ stateFlags: (newStateFlags = update(state.stateFlags)) }));

        const running = !!(newStateFlags & StateFlags.running);
        let success = false;
        let stateLabel = "Stopped";
        const error = !!(newStateFlags & StateFlags.error);
        if ((newStateFlags & StateFlags.done) && !error) {
            success = true;
            stateLabel = "Completed";
        } else if (running) {
            stateLabel = "Running"
        }

        this.setState({ stateLabel });

        if (success) {
            // TODO: Setup charts
            // TODO: Show "success" message box
            // TODO: Mark as solved in persistent state
        }

        this.autoStep = this.autoStep && (running && !success && !error);
    }

    private setStateFlag(flag: StateFlags, on: boolean): void {
        if (on === false) {
            this.setStateFlags(stateFlags => (stateFlags & ~flag));
        } else {
            this.setStateFlags(stateFlags => (stateFlags | flag));
        }
    }

    private updateMemory(address: number, value: number): void {
        this.setState({ [address]: value });
    }

    private load = () => {
        try {
            const sourceLines = this.inputSource.current.value.split("\n");
            this.setState({ sourceLines });
            // TODO: Highlighting

            this.setStateFlags(old => StateFlags.none);

            let inputIndex = 0;
            let outputIndex = 0;
            let done = false;
            const assembledProgram = Assembler.assemble(sourceLines);

            this.programBytes = assembledProgram.bytes.slice();
            this.emulator = new Emulator(assembledProgram, {
                readInput: () => {
                    // TODO: Read next input
                    return 0;
                },

                writeOutput: (value) => {
                    // TODO: Record and test output
                },

                onWriteMemory: (address, value) => {
                    this.updateMemory(address, value);
                },

                onStateUpdated: (data) => {
                    this.setStateFlag(StateFlags.running, data.running);
                    this.setState({
                        cyclesExecuted: data.cyclesExecuted,
                        memoryBytesAccessed: data.memoryBytesAccessed,
                    });

                    // TODO: Highlight address

                    if (done) {
                        this.setStateFlag(StateFlags.done, true);
                    }

                    // TODO: Update variables
                },
            });
        } catch (error) {
            if (error instanceof CompilationError) {
                // TODO: Set error message in pop-up
            } else {
                throw error;
            }
        }
    }

    private stop = () => {
        this.autoStep = false;
        this.setStateFlags(old => StateFlags.none);
    }

    private step = () => {
        if (this.emulator) {
            // TODO: Update highlights
            this.emulator.step();
        }
    }

    private run = () => {
        // TODO
    }

    public render() {
        // TODO: Move this logic to an update and put io in props?
        let inputBytes = [].concat(...this.props.puzzle.io.map(row => row[0]));
        let expectedOutputBytes = [].concat(...this.props.puzzle.io.map(row => row[1]));

        const rowCount = Math.max(inputBytes.length, expectedOutputBytes.length);
        const table: (number | null)[][] = [];
        for (let i = 0; i < rowCount; i++) {
            table.push([
                (i < inputBytes.length) ? inputBytes[i] : null,
                (i < expectedOutputBytes.length) ? expectedOutputBytes[i] : null,
                null
            ]);
        }

        return <>
            <div className="controls">
                <table>
                    <tr><th>{this.props.puzzle.title}}</th></tr>
                    <tr><td className="text">{this.props.puzzle.description}</td></tr>
                </table>
                <br />
                <div className="ioBox">
                    <table>
                        <thead><tr><th>In</th><th>Expected</th><th>Actual</th></tr></thead>
                        <tbody>{
                            table.map(row => <tr>{row.map(col => <td>{col}</td>)}</tr>)
                        }</tbody>
                    </table>
                </div>
                <br />
                <table>
                    <tr><th className="horizontal">State</th><td>{this.state.stateLabel}</td></tr>
                    <tr><th className="horizontal">Cycles</th><td>{this.state.cyclesExecuted}</td></tr>
                    <tr><th className="horizontal">Bytes</th><td>{this.state.memoryBytesAccessed}</td></tr>
                </table>
                <br />
                <button onClick={this.load} disabled={this.isRunning()}>Load</button>
                <button onClick={this.stop} disabled={!this.isRunning()}>Stop</button>
                <button onClick={this.step} disabled={!this.isRunning()}>Step</button>
                <button onClick={this.run} disabled={!this.isRunning()}>Run</button>
                <button>Menu</button>
            </div>
            <div className="program">
                <textarea ref={this.inputSource} className={"input" + (this.isRunning() ? " hidden" : "")} spellCheck={false} wrap="off">{this.props.puzzle.code}</textarea>
                <div className={"source" + (this.isRunning() ? "" : " hidden")}>
                    {
                        this.state.sourceLines.map(line => {
                            if (/\S/.test(line)) {
                                return <div>{line}</div>;
                            } else {
                                return <br />
                            }
                        })
                    }
                </div>
            </div>
            <div>
                <table className="memory"><tr><th colSpan={16}>Memory</th></tr>
                {
                    this.memoryMap.map(row => <tr>{row.map(index => <td>{Sic1Ide.hexifyByte(this.state[index])}</td>)}</tr>)
                }
                </table>
                <br />
                <table className="hidden">
                    <thead><tr><th>Label</th><th>Value</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </>;
    }
}

ReactDOM.render(<Sic1Ide puzzle={puzzles[0].list[0]} />, document.getElementById("root"));
