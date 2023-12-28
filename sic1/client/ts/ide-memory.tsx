import React from "react";
import { Constants } from "../../../lib/src/sic1asm";
import { NumberSpan } from "./ide-number-span";

export interface Sic1MemoryProps {
    hasStarted: boolean;
    currentAddress: number | null;
    memoryMap: number[][];
    memory: { [address: number]: number };
    watchedAddresses: Set<number>;
    highlightAddress?: number;

    onSetHighlightAddress: (address?: number) => void;
    onToggleWatch: (address: number) => void;
}

export class Sic1Memory extends React.Component<Sic1MemoryProps> {
    public render(): React.ReactNode {
        return <table className={`memory${this.props.hasStarted ? " running" : ""}`}><tr><th colSpan={16}>Memory</th></tr>
        {
            this.props.memoryMap.map(row => <tr>{row.map(index =>
                <td className={`${
                    (this.props.hasStarted && (this.props.highlightAddress === index))
                        ? "attention"
                        : ((this.props.currentAddress !== null && index >= this.props.currentAddress && index < this.props.currentAddress + Constants.subleqInstructionBytes)
                            ? "emphasize"
                            : "")
                }${
                    this.props.watchedAddresses.has(index) ? " watched" : ""
                }`}

                    onMouseEnter={() => this.props.onSetHighlightAddress(index)}
                    onMouseLeave={() => this.props.onSetHighlightAddress(undefined)}
                    onClick={this.props.hasStarted ? () => this.props.onToggleWatch(index) : undefined}
                >
                    <NumberSpan format="hex" value={this.props.memory[index]} />
                </td>)}</tr>)
        }
        </table>;
    }
}