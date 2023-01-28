import { Assembler } from "../../../lib/src/sic1asm";
import { unhexifyBytes } from "./shared";

const bytes = unhexifyBytes(process.argv[2]);
const program = `.data ${bytes.map(b => Assembler.unsignedToSigned(b)).join(" ")}`;

console.log(program);
