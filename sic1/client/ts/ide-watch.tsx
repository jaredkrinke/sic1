import { Component, ComponentChild } from "preact";
import { Variable } from "sic1asm";
import { NumberSpan } from "./ide-number-span";

export interface Sic1WatchProps {
    hasStarted: boolean;
    variables: Variable[];
    variableToAddress: { [label: string]: number };
    highlightAddress?: number;

    onSetHighlightAddress: (address?: number) => void;
}

export class Sic1Watch extends Component<Sic1WatchProps> {
    private truncateIfNeeded(text: string, length: number): ComponentChild {
        if (text.length > length) {
            return <span title={text}>{text.slice(0, length - 3)}...</span>;
        } else {
            return text;
        }
    }

    public render(): ComponentChild {
        return <table>
            <thead><tr><th className="width100inline">Label (Address)</th><th>Value</th></tr></thead>
            <tbody>
                {(!this.props.hasStarted)
                    ? <tr><td className="center" colSpan={2}>(not running)</td></tr>
                    : (this.props.variables.length > 0
                        ? this.props.variables.map(v => <tr
                                    onMouseEnter={() => this.props.onSetHighlightAddress(this.props.variableToAddress[v.label])}
                                    onMouseLeave={() => this.props.onSetHighlightAddress(undefined)}
                                >
                                <td
                                    className={"text" + (((this.props.highlightAddress !== undefined) && (this.props.highlightAddress === this.props.variableToAddress[v.label])) ? " attention" : "")}
                                >{this.truncateIfNeeded(v.label, 25)} (<NumberSpan format="decimal" value={this.props.variableToAddress[v.label] ?? 0} />)</td>
                                <td
                                    className={((this.props.highlightAddress !== undefined) && (this.props.highlightAddress === this.props.variableToAddress[v.label])) ? "attention" : ""}
                                ><NumberSpan format="decimal" value={v.value}/></td>
                            </tr>)
                        : <tr><td className="center" colSpan={2}>(empty)</td></tr>)
                }
            </tbody>
        </table>;
    }
}
