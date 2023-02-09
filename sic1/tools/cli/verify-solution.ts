import { ProgramVerificationError, puzzleFlatArray, solutionBytesMax, verifySolution } from "../../shared/puzzles";
import { unhexifyBytes } from "./shared";

const [ _host, _script, puzzleName, program, iterationsRaw ] = process.argv;

const iterations = iterationsRaw ?? 1;

try {
    for (let i = 0; i < iterations; i++) {
        verifySolution(puzzleFlatArray.find(p => p.title === puzzleName), unhexifyBytes(program), 10000, solutionBytesMax);
    }

    console.log("Valid!");
} catch (error) {
    if (error instanceof ProgramVerificationError) {
        console.log("Invalid:");
        console.log(error.message);
        console.log(error.errorContext.inputs.map((input, index) => (index === error.errorContext.inputIndex) ? `[${input}]` : input).join(", "));
    } else {
        console.log(`*** UNEXPECTED INTERNAL ERROR: ${error.message}`);
    }
}
