import { puzzleFlatArray, solutionBytesMax, verifySolution } from "../../shared/puzzles";
import { unhexifyBytes } from "./shared";

const [ _host, _script, puzzleName, program, iterationsRaw ] = process.argv;

const iterations = iterationsRaw ?? 1;

try {
    for (let i = 0; i < iterations; i++) {
        verifySolution(puzzleFlatArray.find(p => p.title === puzzleName), unhexifyBytes(program), 10000, solutionBytesMax);
    }

    console.log("Valid!");
} catch (error) {
    console.log(`*** Invalid: ${error.message}`);
}
