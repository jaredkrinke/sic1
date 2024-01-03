import React from "react";
import { Assembler, Tokenizer, TokenType } from "../../../lib/src/sic1asm";
import { Button } from "./button";
import { Format } from "./puzzles";

const formatDisplayNames = [
    "Numbers",
    "Characters",
    "Strings",
];

export function parseValues(text: string): number[] {
    const tokens = Tokenizer.tokenizeLine(text);
    const input: number[] = [];
    for (const token of tokens) {
        const { tokenType } = token;
        switch (tokenType) {
            case TokenType.whiteSpace:
                break;

            case TokenType.comma:
                break;

            case TokenType.numberLiteral:
                // Note: Test inputs are actually signed
                input.push(Assembler.unsignedToSigned(Assembler.parseValue(token)));
                break;

            case TokenType.characterLiteral:
                input.push(Assembler.unsignedToSigned(Assembler.parseCharacter(token)));
                break;

            case TokenType.stringLiteral:
                input.push(...Assembler.parseString(token).map(u => Assembler.unsignedToSigned(u)));
                break;

            default:
                throw new Error(`Unexpected token: ${token.raw}`);
        }
    }

    return input;
}

interface Sic1CustomInputSettings {
    input: number[];
    text: string;
    inputFormat: Format;
    outputFormat: Format;
};

export interface Sic1InputEditorProperties {
    onApply: (settings: Sic1CustomInputSettings) => void;
    onClose: () => void;

    defaultInputString?: string;
    defaultInputFormat?: Format;
    defaultOutputFormat?: Format;
}

interface Sic1InputEditorState {
    error?: string;
}

export class Sic1InputEditor extends React.Component<Sic1InputEditorProperties, Sic1InputEditorState> {
    private form = React.createRef<HTMLFormElement>();
    private input = React.createRef<HTMLInputElement>();
    private inputFormat = React.createRef<HTMLSelectElement>();
    private outputFormat = React.createRef<HTMLSelectElement>();

    constructor(props) {
        super(props);
        this.state = {};
    }

    private apply(): void {
        if (this.form.current && this.input.current && this.inputFormat.current && this.outputFormat.current) {
            const text = this.input.current.value;
            try {
                const input = parseValues(this.input.current.value);
                this.props.onApply({
                    input,
                    text,
                    inputFormat: parseInt(this.inputFormat.current.value),
                    outputFormat: parseInt(this.outputFormat.current.value),
                });

                this.props.onClose();
                this.setState({ error: undefined });
            } catch (e) {
                this.setState({ error: e.message });
            }
        }
    }

    public componentDidMount(): void {
        const input = this.input.current;
        if (input) {
            input.focus();

            // Move the cursor to the end, for convenience
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }

    public render() {
        return  <>
            <h3>Instructions</h3>
            <p>For input, use the same syntax as in a <code>.data</code> directive (examples: <code>-7</code>, <code>'A'</code>, <code>-"Negated string"</code>).</p>
            <h3>Input values</h3>
            <form
                ref={this.form}
                onSubmit={(event) => {
                    event.preventDefault();
                    this.apply();
                }}
            >
                <input
                    ref={this.input}
                    className="width100"
                    defaultValue={this.props.defaultInputString}
                />
                {this.state.error ? <p>{`Error: ${this.state.error}`}</p> : null}
                <br/>
                <h3>Display formats</h3>
                {([
                    ["Input", this.inputFormat, this.props.defaultInputFormat],
                    ["Output", this.outputFormat, this.props.defaultOutputFormat],
                ] as const).map(([title, ref, format]) => <>
                    <label>{title}:&nbsp;<select ref={ref}>{formatDisplayNames.map((displayName, index) => <option value={index} selected={index === format}>
                        {displayName}</option>)}
                    </select></label><br/>
                </>)}
            </form>
            <br/>
            <Button onClick={() => this.apply()}>Save Changes</Button>
            <Button onClick={() => this.props.onClose()}>Cancel</Button>

        </>;
    }
}
