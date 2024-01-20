import React from "react";
import { Assembler, Variable } from "../../../lib/src/sic1asm";
import { NumberSpan } from "./ide-number-span";
import { FormattedMessage } from "react-intl";

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
            key: `custom${address}`,
            label: <>
                <FormattedMessage
                    id="labelWatchedAddress"
                    description="Text shown in the 'variables' table for a manually watched address, i.e. an address the user manually highlighted"
                    defaultMessage="Address {address}"
                    values={{ address: <NumberSpan format="decimal" value={address} /> }}
                    />
                </>,
            address,
            value: Assembler.unsignedToSigned(this.props.memory[address] ?? 0),
        }));

        const variableWatches = this.props.variables.map(v => ({
            key: v.label,
            label: <>{this.truncateIfNeeded(v.label, 25)} (<NumberSpan format="decimal" value={this.props.variableToAddress[v.label] ?? 0} />)</>,
            address: this.props.variableToAddress[v.label] ?? 0,
            value: v.value,
        }));

        const watches = [...customWatches, ...variableWatches];

        return <table>
            <thead><tr>
                <th className="width100inline">
                    <FormattedMessage
                        id="headerVariableLabel"
                        description="Header for the 'label' column of the variable/watch table, showing name/label and memory address of variables while debugging"
                        defaultMessage="Label (Address)"
                        />
                </th>
                <th>
                    <FormattedMessage
                        id="headerVariableValue"
                        description="Header for the 'value' column of the variable/watch table, showing the value of variables while debugging"
                        defaultMessage="Value"
                        />
                </th>
            </tr></thead>
            <tbody>
                {watches.length > 0
                    ? watches.map(watch => <tr
                                key={watch.key}
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
                    : <tr><td className="center" colSpan={2}>
                        <FormattedMessage
                            id="textVariablesEmpty"
                            description="Text shown in the 'variables' table when there are no variables"
                            defaultMessage="(empty)"
                            />
                        </td></tr>
                }
            </tbody>
        </table>;
    }
}
