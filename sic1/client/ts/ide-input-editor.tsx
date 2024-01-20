import React from "react";
import { Assembler, Tokenizer, TokenType } from "../../../lib/src/sic1asm";
import { Button } from "./button";
import { Format } from "./puzzles";
import { Shared } from "./shared";
import { FormattedMessage, IntlShape } from "react-intl";

const formatDisplayNames = [
    <FormattedMessage
        id="ioTypeNumbers"
        description="Label for the 'number' type, for task input/output in Sandbox Mode"
        defaultMessage="Numbers"
        />,
    <FormattedMessage
        id="ioTypeCharacters"
        description="Label for the 'character' type, for task input/output in Sandbox Mode"
        defaultMessage="Characters"
        />,
    <FormattedMessage
        id="ioTypeStrings"
        description="Label for the 'string' type, for task input/output in Sandbox Mode"
        defaultMessage="Strings"
        />,
];

export function parseValues(intl: IntlShape, text: string): number[] {
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
                throw new Error(intl.formatMessage({
                    id: "errorInputParsing",
                    description: "Error text shown in Sandbox Mode when there's a parsing error for custom input",
                    defaultMessage: `Unexpected token: "{token}"!`,
                }, { token: token.raw }));
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
    intl: IntlShape;

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
                const input = parseValues(this.props.intl, this.input.current.value);
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
            <FormattedMessage
                id="contentInputEditor"
                description="Markup shown at the beginning of the 'input editor' of Sandbox Mode"
                defaultMessage={`<h3>Instructions</h3><p>For input, use the same syntax as in a <code>.data</code> directive (examples: <code>-7</code>, <code>''A''</code>, <code>-"Negated string"</code>).</p>`}
                />
            <h3>
                <FormattedMessage
                    id="headingInputEditor"
                    description="Heading for the 'input values' section of Sandbox Mode's input editor"
                    defaultMessage="Input values"
                    />
            </h3>
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
                {this.state.error
                    ? <p>
                        <FormattedMessage
                            id="textInputError"
                            description="Text shown when an error occurs when parsing custom input in Sandbox Mode"
                            defaultMessage="Error: {message}"
                            values={{ message: this.state.error }}
                            />
                        </p>
                    : null}
                <br/>
                <h3>
                    <FormattedMessage
                        id="headingInputFormats"
                        description="Heading for the 'display formats' section of Sandbox Mode's editor"
                        defaultMessage="Display formats"
                        />
                </h3>
                {([
                    ["input", Shared.resources.headerIOIn, this.inputFormat, this.props.defaultInputFormat],
                    ["output", Shared.resources.headerIOOut, this.outputFormat, this.props.defaultOutputFormat],
                ] as const).map(([key, title, ref, format]) => <React.Fragment key={key}>
                    <label>{title}:&nbsp;<select ref={ref} defaultValue={format}>{formatDisplayNames.map((displayName, index) => <option key={index} value={index}>
                        {displayName}</option>)}
                    </select></label><br/>
                </React.Fragment>)}
            </form>
            <br/>
            <Button onClick={() => this.apply()}>{Shared.resources.saveChanges}</Button>
            <Button onClick={() => this.props.onClose()}>{Shared.resources.cancel}</Button>

        </>;
    }
}
