import { Component, ComponentChild } from "preact";
import { Constants } from "sic1asm";
import { NumberSpan } from "./ide-number-span";

export interface Sic1MemoryProps {
    hasStarted: boolean;
    currentAddress: number | null;
    memoryMap: number[][];
    memory: { [address: number]: number };
    highlightAddress?: number;

    onSetHighlightAddress: (address?: number) => void;
}

export class Sic1Memory extends Component<Sic1MemoryProps> {
    public render(): ComponentChild {
        return <table className="memory"><tr><th colSpan={16}>Memory</th></tr>
        {
            this.props.memoryMap.map(row => <tr>{row.map(index =>
                <td className={
                    (this.props.hasStarted && (this.props.highlightAddress === index))
                        ? "attention"
                        : ((this.props.currentAddress !== null && index >= this.props.currentAddress && index < this.props.currentAddress + Constants.subleqInstructionBytes)
                            ? "emphasize"
                            : "")
                }

                    onMouseEnter={() => this.props.onSetHighlightAddress(index)}
                    onMouseLeave={() => this.props.onSetHighlightAddress(undefined)}
                >
                    <NumberSpan format="hex" value={this.props.memory[index]} />
                </td>)}</tr>)
        }
        </table>;
    }
}