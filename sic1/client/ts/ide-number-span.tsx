import { Component, ComponentChild } from "preact";
import { Assembler } from "sic1asm";
import { Shared } from "./shared";

export class NumberSpan extends Component<{ format: "hex" | "decimal", value: number }> {
    public render(): ComponentChild {
        const n = this.props.value;
        switch (this.props.format) {
            case "hex":
                return <span title={(n <= 127) ? `${n}` : `${Assembler.unsignedToSigned(n)} (${n})`}>{Shared.hexifyByte(n)}</span>;
            
            case "decimal":
                return <span title={(n >= 0) ? `0x${Shared.hexifyByte(n)}` : `0x${Shared.hexifyByte(Assembler.signedToUnsigned(n))} (${Assembler.signedToUnsigned(n)})`}>{n}</span>;
        }
    }
}
