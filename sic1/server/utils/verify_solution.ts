import { Solution } from "./shared";
import { verifySolution } from "./validation";

const [ _host, _script, puzzleName, program ] = process.argv;
const solution: Solution = {
    userId: "abcdefghijklmno",
    cyclesExecuted: 10000,
    memoryBytesAccessed: 256,
    program: program,
    testName: puzzleName,
};

verifySolution(solution, true);
