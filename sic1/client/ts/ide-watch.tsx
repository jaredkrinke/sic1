import React from "react";
import { Assembler, Variable } from "../../../lib/src/sic1asm";
import { NumberSpan } from "./ide-number-span";

export interface Sic1WatchProps {
    hasStarted: boolean;
    memory: { [address: number]: number };
    variables: Variable[];
    variableToAddress: { [label: string]: number };
    watchedAddresses: Set<number>;
    highlightAddress?: number;

    onSetHighlightAddress: (address?: number) => void;
}

export class Sic1Watch extends React.Component<Sic1WatchProps> {
    private truncateIfNeeded(text: string, length: number): React.ReactNode {
        if (text.length > length) {
            return <span title={text}>{text.slice(0, length - 3)}...</span>;
        } else {
            return text;
        }
    }

    public render(): React.ReactNode {
        const customWatches = Array.from(this.props.watchedAddresses.values()).map(address => ({
            label: <>Address <NumberSpan format="decimal" value={address} /></>,
            address,
            value: Assembler.unsignedToSigned(this.props.memory[address] ?? 0),
        }));

        const variableWatches = this.props.variables.map(v => ({
            label: <>{this.truncateIfNeeded(v.label, 25)} (<NumberSpan format="decimal" value={this.props.variableToAddress[v.label] ?? 0} />)</>,
            address: this.props.variableToAddress[v.label] ?? 0,
            value: v.value,
        }));

        const watches = [...customWatches, ...variableWatches];

        return <table>
            <thead><tr><th className="width100inline">Label (Address)</th><th>Value</th></tr></thead>
            <tbody>
                {(!this.props.hasStarted)
                    ? <tr><td className="center" colSpan={2}>(not running)</td></tr>
                    : (watches.length > 0
                        ? watches.map(watch => <tr
                                    onMouseEnter={() => this.props.onSetHighlightAddress(watch.address)}
                                    onMouseLeave={() => this.props.onSetHighlightAddress(undefined)}
                                >
                                <td
                                    className={"text" + (((this.props.highlightAddress !== undefined) && (this.props.highlightAddress === watch.address)) ? " attention" : "")}
                                >{watch.label}</td>
                                <td
                                    className={((this.props.highlightAddress !== undefined) && (this.props.highlightAddress === watch.address)) ? "attention" : ""}
                                ><NumberSpan format="decimal" value={watch.value}/></td>
                            </tr>)
                        : <tr><td className="center" colSpan={2}>(empty)</td></tr>)
                }
            </tbody>
        </table>;
    }
}
