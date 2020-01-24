import { Assembler, Emulator } from "../../lib-ts/src/sic1asm"
declare const React: typeof import("react");
declare const ReactDOM: typeof import("react-dom");

enum State {
    stopped,
    running,
    completed,
}

const stateToLabel: {[P in State]: string} = {
    [State.stopped]: "Stopped",
    [State.running]: "Running",
    [State.completed]: "Completed",
};

// TODO: Any class this could be pushed into?
function hexifyByte(v: number): string {
    var str = v.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

// TODO: User id and persistent state
// TODO: Message box and dimmer
// TODO: Message box escape key
// TODO: Highlighting
// TODO: Puzzle definitions
// TODO: Puzzle load
// TODO: Save puzzle progress
// TODO: Service integration
// TODO: Charts
// TODO: State management
// TODO: Puzzle list
// TODO: Emulator
// TODO: Run/auto-step
// TODO: Welcome/intro
// TODO: User stats/resume
// TODO: Load last open puzzle

interface Sic1State {
    title: string;
    description: string;
    defaultCode: string;
    io: (number | number[])[][];

    state: State;
    cyclesExecuted: number;
    memoryBytesAccessed: number;

    // Memory
    [index: number]: number;
}

class Sic1 extends React.Component<{}, Sic1State> {
    private memoryMap: number[][];

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


        let state = {
            state: State.stopped,
            cyclesExecuted: 0,
            memoryBytesAccessed: 0,

            title: "Subleq Instruction and Output",
            description: "Use subleq and input/output to negate an input and write it out.",
            io: [
                [0, 0],
                [1, [1, 0]],
                [2, [1, 1, 0]],
                [5, [1, 1, 1, 1, 1, 0]],
                [3, [1, 1, 1, 0]],
                [7, [1, 1, 1, 1, 1, 1, 1, 0]]
            ],
            defaultCode:
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
`,
        };

        // Initialize memory
        for (let i = 0; i < 256; i++) {
            state[i] = 0;
        }

        this.state = state;
    }

    private updateMemory(address: number, value: number): void {
        this.setState({ [address]: value });
    }

    public render() {
        // TODO
        const running = false;

        // TODO: Move this logic to an update and put io in props?
        let inputBytes = [].concat(...this.state.io.map(row => row[0]));
        let expectedOutputBytes = [].concat(...this.state.io.map(row => row[1]));

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
                    <tr><th>{this.state.title}}</th></tr>
                    <tr><td className="text">{this.state.description}</td></tr>
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
                    <tr><th className="horizontal">State</th><td>{stateToLabel[this.state.state]}</td></tr>
                    <tr><th className="horizontal">Cycles</th><td>{this.state.cyclesExecuted}</td></tr>
                    <tr><th className="horizontal">Bytes</th><td>{this.state.memoryBytesAccessed}</td></tr>
                </table>
                <br />
                <button disabled={running}>Load</button>
                <button disabled={!running}>Stop</button>
                <button disabled={!running}>Step</button>
                <button disabled={!running}>Run</button>
                <button>Menu</button>
            </div>
            <div className="program">
                <textarea className="input" spellCheck={false} wrap="off">{this.state.defaultCode}</textarea>
                <div className="source hidden"></div>
            </div>
            <div>
                <table className="memory"><tr><th colSpan={16}>Memory</th></tr>
                {
                    this.memoryMap.map(row => <tr>{row.map(index => <td>{hexifyByte(this.state[index])}</td>)}</tr>)
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

ReactDOM.render(<Sic1 />, document.getElementById("root"));
