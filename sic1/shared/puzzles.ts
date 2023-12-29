import { AssembledProgram, Assembler, Emulator } from "sic1asm";

export interface Puzzle {
    title: string;
    test?: {
        fixed?: number[][][];
        createRandomTest: () => number[][];
        getExpectedOutput: (input: number[][]) => number[][];
    };
    io: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
}

export interface PuzzleTestSet {
    input: number[];
    output: number[];
}

export interface PuzzleTest {
    testSets: PuzzleTestSet[];
}

function flattenFixedTest(test: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>): { input: number[], output: number[] } {
    let input: number[] = [];
    let output: number[] = [];
    test.forEach(row => {
        input = input.concat(row[0]);
        output = output.concat(row[1]);
    });

    return { input, output };
}

function arrayEqual(a: number[], b: number[]): boolean {
    if (a.length === b.length) {
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

export function generatePuzzleTest(puzzle: Puzzle): PuzzleTest {
    const testSets: PuzzleTestSet[] = [];

    // Standard tests
    const { input, output } = flattenFixedTest(puzzle.io);
    testSets.push({ input, output });

    // Extra and random tests
    if (puzzle.test) {
        // Fixed and random test sets
        for (const fixedInput of (puzzle.test.fixed ?? []).concat([puzzle.test.createRandomTest()])) {
            testSets.push({
                input: ([] as number[]).concat(...fixedInput),
                output: ([] as number[]).concat(...puzzle.test.getExpectedOutput(fixedInput)),
            });
        }

        // Also add one that's similar to the first test set (but not identical!)
        while (true) {
            const test = puzzle.io.slice();
            if (test.length <= 1) {
                // Only one input set, so no real need to duplicate a random test
                break;
            }

            const moreRandomInputGroups = puzzle.test.createRandomTest();
            const randomIndex = Math.floor(moreRandomInputGroups.length * Math.random());
            test.splice(test.length - 1, 1, [moreRandomInputGroups[randomIndex], puzzle.test.getExpectedOutput(moreRandomInputGroups)[randomIndex]]);

            const testSet = flattenFixedTest(test);
            if (!arrayEqual(testSet.input, input) && !arrayEqual(testSet.output, output)) {
                testSets.push(testSet);
                break;
            }
        }
    }

    return {
        testSets,
    }
}

// Backend/offline solution validation
export class ProgramVerificationError extends Error {
    constructor(message: string, public errorContext: { inputs: number[], inputIndex?: number }) {
        super(message);

        // Ensure prototype is ProgramVerificationError
        Object.setPrototypeOf(this, ProgramVerificationError.prototype);
    }
}

function verifyProgram(context: string, inputs: number[], expectedOutputs: number[], program: AssembledProgram, maxCyclesExecuted: number, maxMemoryBytesAccessed: number): void {
    let inputIndex = 0;
    let outputIndex = 0;

    let correct = true;
    let errorContext = "";
    const emulator = new Emulator(program, {
        readInput: () => inputs[inputIndex++],
        writeOutput: n => {
            const expected = expectedOutputs[outputIndex++];
            if (n !== expected) {
                correct = false;
                if (errorContext === "") {
                    errorContext = `expected ${expected} but got ${n} instead at index ${outputIndex - 1}`;
                }
            }
        },

        onHalt: () => { throw new ProgramVerificationError("Execution halted unexpectedly", { inputs, inputIndex }); },
    });

    while (correct && outputIndex < expectedOutputs.length && emulator.getCyclesExecuted() <= maxCyclesExecuted && emulator.getMemoryBytesAccessed() <= maxMemoryBytesAccessed) {
        emulator.step();
    }

    if (emulator.getCyclesExecuted() > maxCyclesExecuted || emulator.getMemoryBytesAccessed() > maxMemoryBytesAccessed) {
        throw new ProgramVerificationError(`Execution during ${context} did not complete within ${maxCyclesExecuted} cycles and ${maxMemoryBytesAccessed} bytes (actual: ${emulator.getCyclesExecuted()} cycles, ${emulator.getMemoryBytesAccessed()} bytes)`, { inputs, inputIndex });
    }

    if (!correct) {
        throw new ProgramVerificationError(`Incorrect output produced during ${context} (${errorContext})`, { inputs, inputIndex });
    }
}

export const verificationMaxCycles = 100000;
export const solutionBytesMax = 256;

export function verifySolution(puzzle: Puzzle, bytes: number[], cyclesExecuted: number, memoryBytesAccessed: number): void {
    const { testSets } = generatePuzzleTest(puzzle);
    const program: AssembledProgram = {
        bytes,
        sourceMap: [],
        variables: [],
        breakpoints: [],
    };

    // Verify using standard input and supplied stats
    verifyProgram("standard input", testSets[0].input, testSets[0].output, program, cyclesExecuted, memoryBytesAccessed);

    // Verify subsequent tests
    for (let i = 1; i < testSets.length; i++) {
        verifyProgram(`test set ${i + 1}`, testSets[i].input, testSets[i].output, program, verificationMaxCycles, solutionBytesMax);
    }
}

// Helpers
function randomPositive() {
    return Math.floor(Math.random() * 10) + 1;
}

function randomKindOfLargePositive() {
    return Math.floor(Math.random() * 99) + 1;
}

function randomLargePositive() {
    return Math.floor(Math.random() * 101) + 1;
}

function randomNonnegative() {
    return Math.floor(Math.random() * 10);
}

function randomPositiveSequence(sequenceLength: number = 6) {
    const sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        sequence.push(randomPositive());
    }
    sequence.push(0);
    return sequence;
}

function randomSet(setSize: number = 5) {
    const pool = [];
    for (let i = 0; i < setSize * 2; i++) {
        pool.push(i + 1);
    }

    const set = [];
    for (let i = 0; i < setSize; i++) {
        const value = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        set.push(value);
    }
    set.push(0);
    return set;
}

function charactersToNumbers(characters: string): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < characters.length; i++) {
        numbers.push(characters.charCodeAt(i));
    }
    return numbers;
}

function stringToNumbers(str: string): number[] {
    const numbers = charactersToNumbers(str);
    numbers.push(0);
    return numbers;
}

function stringsToNumbers(strings: string[]): number[] {
    const numbers: number[] = [];
    for (const str of strings) {
        numbers.push(...charactersToNumbers(str));
        numbers.push(0);
    }
    return numbers;
}

export function shuffleInPlace<T>(array: T[]): void {
    for (let i = array.length - 1; i >= 1; i--) {
        const index = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[index];
        array[index] = tmp;
    }
}

export const puzzleFlatArray: Puzzle[] = [
    {
        title: "Subleq Instruction and Output",
        io: [
            [[3], [-3]]
        ],
    },
    {
        title: "Data Directive and Looping",
        io: [
            [[3], [-3]],
            [[4], [-4]],
            [[5], [-5]]
        ],
    },
    {
        title: "First Assessment",
        test: {
            createRandomTest: () => [1, 2, 3].map(a => [randomPositive()]),
            getExpectedOutput: (input) => input,
        },
        io: [
            [[1], [1]],
            [[2], [2]],
            [[3], [3]]
        ],
    },
    {
        title: "Addition",
        test: {
            fixed: [[[99, 28], [-100, 100], [1, -2]]],
            createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
            getExpectedOutput: (input) => input.map(a => [a[0] + a[1]]),
        },
        io: [
            [[1, 1], [2]],
            [[1, 2], [3]],
            [[1, -1], [0]],
            [[11, 25], [36]],
            [[82, 17], [99]]
        ],
    },
    {
        title: "Subtraction",
        test: {
            fixed: [[[100, 101], [111, 72], [1, -120]]],
            createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
            getExpectedOutput: (input) => input.map(a => [a[0] - a[1]]),
        },
        io: [
            [[1, 1], [0]],
            [[1, 2], [-1]],
            [[1, -1], [2]],
            [[11, 25], [-14]],
            [[82, 17], [65]]
        ],
    },
    {
        title: "Sign Function",
        test: {
            fixed: [
                [[127], [99], [-100], [1], [0], [99], [1]],
                [[-1], [-1], [-2], [3], [0], [0]],
                [[-1], [1], [2], [-3], [0], [0]],
            ],
            createRandomTest: () => [1, 2, 3, 4].map(a => [Math.floor(Math.random() * 5) - 2]),
            getExpectedOutput: (input) => input.map(a => a.map(b => b < 0 ? -1 : (b > 0 ? 1 : 0))),
        },
        io: [
            [[-1], [-1]],
            [[0], [0]],
            [[1], [1]],
            [[7], [1]],
            [[-29], [-1]],
            [[99], [1]],
            [[-99], [-1]]
        ],
    },
    {
        title: "Multiplication",
        test: {
            fixed: [[[11, 11], [2, 3, 0, 0], [11, 0]]],
            createRandomTest: () => [1, 2, 3].map(a => [randomNonnegative(), randomNonnegative()]),
            getExpectedOutput: (input) => input.map(a => {
                const result: number[] = [];
                for (let i = 0; i < a.length; i += 2) {
                    result.push(a[i] * a[i + 1]);
                }
                return result;
            }),
        },
        io: [
            [[1, 0], [0]],
            [[0, 1], [0]],
            [[1, 1], [1]],
            [[2, 3], [6]],
            [[7, 13], [91]]
        ],
    },
    {
        title: "Division",
        test: {
            fixed: [[[122, 11], [16, 3], [7, 7]]],
            createRandomTest: () => [1, 2, 3, 4].map(a => [randomPositive(), randomPositive()]),
            getExpectedOutput: (input) => input.map(a => [Math.floor(a[0] / a[1]), a[0] % a[1]]),
        },
        io: [
            [[1, 1], [1, 0]],
            [[9, 3], [3, 0]],
            [[17, 2], [8, 1]],
            [[67, 9], [7, 4]]
        ],
    },
    {
        title: "Sequence Sum",
        test: {
            fixed: [[[100, 20, 7, 0]]],
            createRandomTest: () => [1, 2, 3].map(a => randomPositiveSequence()),
            getExpectedOutput: (input) => input.map(a => [a.reduce((sum, value) => sum + value, 0)]),
        },
        io: [
            [[1, 1, 1, 0], [3]],
            [[1, 2, 3, 0], [6]],
            [[3, 5, 7, 11, 0], [26]],
            [[53, 13, 22, 9, 0], [97]]
        ],
    },
    {
        title: "Sequence Cardinality",
        test: {
            fixed: [[[100, 100, 100, 0]]],
            createRandomTest: () => [1, 2].map(a => randomPositiveSequence(Math.floor(Math.random() * 4) + 2)),
            getExpectedOutput: (input) => input.map(a => [a.reduce((sum) => sum + 1, -1)]),
        },
        io: [
            [[0], [0]],
            [[1, 0], [1]],
            [[3, 4, 0], [2]],
            [[9, 2, 7, 13, 26, 0], [5]],
        ],
    },
    {
        title: "Number to Sequence",
        test: {
            fixed: [[[2], [0], [3], [0]]],
            createRandomTest: () => [1, 2].map(a => [randomPositive()]),
            getExpectedOutput: (input) => input.map(value => {
                const output = [];
                for (let i = 0; i < value[0]; i++) {
                    output.push(1);
                }
                output.push(0);
                return output;
            }),
        },
        io: [
            [[0], [0]],
            [[1], [1, 0]],
            [[2], [1, 1, 0]],
            [[5], [1, 1, 1, 1, 1, 0]],
            [[3], [1, 1, 1, 0]],
            [[7], [1, 1, 1, 1, 1, 1, 1, 0]]
        ],
    },
    {
        title: "Self-Modifying Code",
        io: [
            [[0], [12, 1, 3, -2, 12, 6, 1, 13, 9, 12, 12, 0]]
        ],
    },
    {
        title: "Stack Memory",
        io: [
            [[3, 5, 7], [7, 5, 3]]
        ],
    },
    {
        title: "Reverse Sequence",
        test: {
            fixed: [[[98, 99, 100, 0]]],
            createRandomTest: () => [1, 2].map(() => randomPositiveSequence()),
            getExpectedOutput: input => input.map(seq => seq.slice(0, seq.length - 1).reverse().concat([0])),
        },
        io: [
            [[1, 2, 3, 0], [3, 2, 1, 0]],
            [[3, 2, 1, 0], [1, 2, 3, 0]],
            [[3, 5, 7, 11, 13, 15, 17, 0], [17, 15, 13, 11, 7, 5, 3, 0]]
        ],
    },
    {
        title: "Interleave",
        test: {
            createRandomTest: () => [1, 2].map(() => randomPositiveSequence(3).concat(randomPositiveSequence(3))),
            getExpectedOutput: input => input.map(seq => {
                const output = [];
                for (let i = 0; i < seq.length / 2; i++) {
                    output.push(seq[i]);
                    output.push(seq[i + seq.length / 2]);
                }
                output.pop();
                return output;
            }),
        },
        io: [
            [[1, 1, 1, 0, 2, 2, 2, 0], [1, 2, 1, 2, 1, 2, 0]],
            [[9, 8, 7, 0, 10, 20, 30, 0], [9, 10, 8, 20, 7, 30, 0]],
            [[3, 5, 7, 11, 0, 13, 17, 19, 23, 0], [3, 13, 5, 17, 7, 19, 11, 23, 0]],
        ],
    },
    {
        title: "Indicator Function",
        test: {
            fixed: [[[13, 57, 99, 63, 0, 13, 99, 57, 0], [61, 62, 63, 64, 0, 66, 64, 62, 60, 0], [97, 98, 99, 0, 77, 88, 99, 0]]],
            createRandomTest: () => [1, 2].map(() => randomSet().concat(randomSet())),
            getExpectedOutput: input => input.map(seqIn => {
                const seq = seqIn.slice();
                const a = seq.splice(0, seq.indexOf(0));
                seq.shift();
                const b = seq.splice(0, seq.indexOf(0));
                return b.map(value => (a.indexOf(value) >= 0) ? 1 : 0);
            }),
        },
        io: [
            [[2, 4, 6, 0, 1, 2, 3, 0], [0, 1, 0]],
            [[3, 5, 7, 0, 9, 6, 3, 0], [0, 0, 1]],
        ],
    },
    {
        title: "Sort",
        test: {
            fixed: [[[93, 94, 95, 96, 97, 98, 99, 0]]],
            createRandomTest: () => [1, 2].map(() => randomPositiveSequence()),
            getExpectedOutput: input => input.map(seq => seq.slice(0, seq.length - 1).sort((a, b) => a - b).concat([0])),
        },
        io: [
            [[3, 1, 2, 0], [1, 2, 3, 0]],
            [[9, 9, 5, 0], [5, 9, 9, 0]],
            [[17, 13, 19, 5, 23, 7, 0], [5, 7, 13, 17, 19, 23, 0]],
        ],
    },
    {
        title: "Mode",
        test: {
            fixed: [[[96, 97, 98, 97, 96, 98, 99, 96, 98, 96, 0], [87, 49, 87, 3, 49, 49, 3, 0]]],
            createRandomTest: () => [1, 2].map((count) => {
                const numbers = [1, 2, 3].map(n => randomKindOfLargePositive());
                const input = [];
                for (let j = 0; j < 3; j++) {
                    for (let c = 0; c <= count; c++) {
                        input.push(numbers[j]);
                    }
                }
                input.push(numbers[Math.floor(Math.random() * numbers.length)]);
                shuffleInPlace(input);
                input.push(0);
                return input;
            }),
            getExpectedOutput: input => input.map(seq => {
                let counts = {};
                for (const value of seq) {
                    if (counts[value]) {
                        counts[value]++;
                    } else {
                        counts[value] = 1;
                    }
                }

                let max = 0;
                let mode = 0;
                for (const key in counts) {
                    if (counts[key] > max) {
                        max = counts[key];
                        mode = parseInt(key);
                    }
                }
                return [mode];
            }),
        },
        io: [
            [[1, 2, 3, 3, 0], [3]],
            [[1, 2, 1, 2, 1, 0], [1]],
            [[3, 1, 2, 3, 1, 2, 3, 3, 1, 2, 2, 2, 0], [2]],
        ],
    },
    {
        title: "Characters",
        io: [
            [[0], charactersToNumbers("Hi")],
        ],
    },
    {
        title: "Decimal Digits",
        test: {
            fixed: [[charactersToNumbers("0"), charactersToNumbers("9")]],
            createRandomTest: () => [1, 2, 3, 4, 5, 6].map(n => charactersToNumbers(Math.floor(Math.random() * 10).toString())),
            getExpectedOutput: input => input.map(seq => [parseInt(String.fromCharCode(seq[0]))]),
        },
        io: [
            [charactersToNumbers("1"), [1]],
            [charactersToNumbers("2"), [2]],
            [charactersToNumbers("7"), [7]],
        ],
    },
    {
        title: "Uppercase",
        test: {
            fixed: [[["a".charCodeAt(0)], ["z".charCodeAt(0)], ["a".charCodeAt(0) - 1], ["z".charCodeAt(0) + 1]]],
            createRandomTest: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => [Math.floor(Math.random() * 75) + 48]),
            getExpectedOutput: input => input.map(seq => [String.fromCharCode(seq[0]).toUpperCase().charCodeAt(0)]),
        },
        io: [
            [charactersToNumbers("U"), charactersToNumbers("U")],
            [charactersToNumbers("r"), charactersToNumbers("R")],
            [charactersToNumbers("g"), charactersToNumbers("G")],
            [charactersToNumbers("e"), charactersToNumbers("E")],
            [charactersToNumbers("n"), charactersToNumbers("N")],
            [charactersToNumbers("t"), charactersToNumbers("T")],
            [charactersToNumbers("!"), charactersToNumbers("!")],
        ],
    },
    {
        title: "Strings",
        io: [
            [[0], stringToNumbers("Hello, world!")],
        ],
    },
    {
        title: "Tokenizer",
        test: {
            fixed: [[stringToNumbers("subleq @OUT @IN"), stringToNumbers(".data 0")]],
            createRandomTest: () => [stringToNumbers([1, 2, 3].map(n => String.fromCharCode(...[1, 2, 3].map(n2 => Math.floor(Math.random() * 75) + 48))).join(" "))],
            getExpectedOutput: input => input.map(seq => stringsToNumbers(String.fromCharCode(...seq.slice(0, seq.length - 1)).split(" "))),
        },
        io: [
            [stringToNumbers("The quick brown fox loves SIC Systems"), stringsToNumbers(["The", "quick", "brown", "fox", "loves", "SIC", "Systems"])],
        ],
    },
    {
        title: "Parse Decimal",
        test: {
            fixed: [[stringToNumbers("123"), stringToNumbers("9")]],
            createRandomTest: () => [1, 2, 3].map(n => stringToNumbers(randomLargePositive().toString())),
            getExpectedOutput: input => input.map(seq => [parseInt(String.fromCharCode(...seq.slice(0, seq.length - 1)))]),
        },
        io: [
            [stringToNumbers("1"), [1]],
            [stringToNumbers("20"), [20]],
            [stringToNumbers("74"), [74]],
        ],
    },
    {
        title: "Print Decimal",
        test: {
            fixed: [[[123], [9], [100], [101], [12]]],
            createRandomTest: () => [1, 2, 3].map(n => [randomLargePositive()]),
            getExpectedOutput: input => input.map(seq => stringToNumbers(seq[0].toString())),
        },
        io: [
            [[1], stringToNumbers("1")],
            [[20], stringToNumbers("20")],
            [[74], stringToNumbers("74")],
        ],
    },
    {
        title: "Calculator",
        test: {
            fixed: [[stringToNumbers("10 * 11"), stringToNumbers("120 - 61"), stringToNumbers("61 + 62"), stringToNumbers("8 * 1")]],
            createRandomTest: () => [1, 2, 3, 4].map(n => {
                const operations = ["+", "-", "*"];
                const operation = operations[Math.floor(Math.random() * operations.length)];
                let a: number;
                let b: number;
                switch (operation) {
                    case "+":
                        a = randomLargePositive();
                        b = Math.floor(Math.random() * (120 - a)) + 1;
                        break;

                    case "-":
                        a = randomLargePositive();
                        b = randomLargePositive();
                        break;

                    case "*":
                        a = Math.floor(Math.random() * 11) + 1;
                        b = Math.floor(Math.random() * 11) + 1;
                        break;
                }

                return stringToNumbers(`${a} ${operation} ${b}`);
            }),
            getExpectedOutput: input => input.map(seq => {
                const parts = String.fromCharCode(...seq.slice(0, seq.length - 1)).split(" ");
                const a = parseInt(parts[0]);
                const b = parseInt(parts[2]);
                switch (parts[1]) {
                    case "+": return [a + b];
                    case "-": return [a - b];
                    case "*": return [a * b];
                }
            }),
        },
        io: [
            [stringToNumbers("1 + 1"), [2]],
            [stringToNumbers("99 - 100"), [-1]],
            [stringToNumbers("10 * 4"), [40]],
        ],
    },
    {
        title: "Multi-Line Strings",
        io: [
            [stringToNumbers(".data 1\n.data 2\n.data 3\n"), stringsToNumbers([".data 1", ".data 2", ".data 3"])],
        ],
    },
    {
        title: "Parse Data Directives",
        test: {
            fixed: [[stringToNumbers(".data 0\n.data -128\n.data 127\n")]],
            createRandomTest: () => [stringToNumbers([1, 2, 3, 4].map(n => `.data ${Math.floor(Math.random() * 256) - 128}`).join("\n") + "\n")],
            getExpectedOutput: input => input.map(seq => String.fromCharCode(...seq.slice(0, seq.length - 1))
                .replace(/[.]data/g, "")
                .split("\n")
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => parseInt(s))),
        },
        io: [
            [stringToNumbers(".data 5\n.data -7\n.data 11\n"), [5, -7, 11]],
        ],
    },
    {
        title: "Parse Subleq Instructions",
        test: {
            fixed: [[stringToNumbers("subleq 7 253 255\nsubleq 7 7 0\n")]],
            createRandomTest: () => [stringToNumbers([1, 2, 3].map(n => `subleq ${[1, 2, 3].map(x => Math.floor(Math.random() * 256).toString()).join(" ")}`).join("\n") + "\n")],
            getExpectedOutput: input => input.map(seq => String.fromCharCode(...seq.slice(0, seq.length - 1))
                .replace(/subleq/g, "")
                .split(/[ \n]/)
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => Assembler.unsignedToSigned(parseInt(s)))),
        },
        io: [
            [stringToNumbers("subleq 9 253 3\nsubleq 254 9 6\nsubleq 9 9 0\n"), [9, -3, 3, -2, 9, 6, 9, 9, 0]],
        ],
    },
    {
        title: "Self-Hosting",
        test: {
            fixed: [
                [stringToNumbers(
`subleq 18 17 3
subleq 17 18 6
subleq 254 17 9
subleq 16 15 255
subleq 18 18 0
.data 1
.data 5
.data -1
.data 0
`
                )],
            ],
            createRandomTest: () => [
                (() => {
                    const primes = [1, -3, 5, -7, 11, -13, 17, -19];
                    const x = primes[Math.floor(Math.random() * primes.length)];
                    const y = primes[Math.floor(Math.random() * primes.length)];
                    const addresses = [16, 17];
                    const a1 = addresses[Math.floor(Math.random() * addresses.length)];
                    const a2 = addresses[Math.floor(Math.random() * addresses.length)];
                    const a3 = addresses[Math.floor(Math.random() * addresses.length)];
                    return stringToNumbers(
`subleq 15 ${a1} ${((Math.random() * 2) >= 1) ? 9 : 3}
subleq 15 ${a2} ${((Math.random() * 2) >= 1) ? 9 : 6}
subleq 15 ${a3} 9
subleq 254 15 12
subleq 15 15 255
.data ${x}
.data ${y}
.data 0
`
                    );
                })(),
                stringToNumbers(
`subleq 18 17 3
subleq 17 18 6
subleq 254 17 9
subleq 16 15 255
subleq 18 18 0
.data 1
.data 5
.data -${Math.floor(Math.random() * 3) + 1}
.data 0
`
                    ),
            ],
            getExpectedOutput: input => input.map(seq => {
                const input = String.fromCharCode(...seq.slice(0, seq.length - 1)).split("\n");
                const result = [];
                const emulator = new Emulator(Assembler.assemble(input), {
                    writeOutput: n => {
                        result.push(n);
                    },
                });

                let step = 0;
                while (step++ < 50 && emulator.isRunning()) {
                    emulator.step();
                }

                return result;
            }),
        },
        io: [
            // subleq @b @a
            // subleq @b @a
            // subleq @OUT @b @HALT

            // @a: .data -9
            // @b: .data 0

            [stringToNumbers("subleq 10 9 3\nsubleq 10 9 6\nsubleq 254 10 255\n\n.data -9\n.data 0\n"), [-18]],
        ],
    },
    {
        title: "Self-Hosting Part 2",
        test: {
            // Derived from a minimal reflector:
            //
            // @read:
            // subleq @l3+2 0 3
            // subleq @OUT @l3+2 6
            // @l3: subleq @read+1, @l4+2 0
            // @l4: subleq @counter 0 @HALT ; Replace that second address to change increment
            // subleq @l3+2 @l3+2 @read
            // @counter: .data 15
            fixed: [[
                ...[0, 2, 5].map(address => stringToNumbers(`subleq 8 0 3\nsubleq 254 8 6\nsubleq 1 11 0\nsubleq 15 ${address} 255\nsubleq 8 8 0\n.data 15\n`)),

                // Output every other byte
                stringToNumbers("subleq 254 0 3\nsubleq 1 12 6\nsubleq 14 12 0\nsubleq 15 15 255\n.data -2\n.data 1\n.data -11\n.data 0\n"),
            ]],

            createRandomTest: () => {
                const result: number[][] = [];

                for (let i = 0; i < 2; i++) {
                    // Derived from code that patches reading one byte:
                    //
                    //@l1: subleq @l2 @a
                    // @l2: subleq @l3+6 @b
                    // @l3: subleq @OUT-4 @l1+1 ; This address changes
                    // subleq @z @z @HALT
                    // @a: .data 6
                    // @b: .data -4
                    // @z: .data 0

                    const a = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 5) + 1;
                    result.push(stringToNumbers(
`subleq 3 12 3
subleq ${6+a} 13 6
subleq ${254-b} ${Math.floor(Math.random() * 10)} 9
subleq 14 14 255
.data ${a}
.data -${b}
.data 0
`
                    ));
                }

                // Derived from code that patches two instructions:
                //
                // @unmask:
                // subleq @masked, @mask
                // subleq @unmask, @n_1
                // subleq @counter, @n_1, @unmask
                // @masked: ; subleq @OUT, @o
                // .data 53
                // .data 70
                // .data 67
                // .data 70 ; subleq @o, @o, @HALT
                // .data 70
                // .data 54
                // .data 21 ; @o: .data ...
                // @mask: .data 55
                // @counter: .data -6
                // @n_1: .data -1
                const mask = Math.floor(Math.random() * 30) + 20;
                const output = Math.floor(Math.random() * 30) + 20;

                result.push(stringToNumbers(
`subleq 9 16 3
subleq 0 18 6
subleq 17 18 0
.data ${Assembler.unsignedToSigned(254 + mask)}
.data ${15 + mask}
.data ${12 + mask}
.data ${15 + mask}
.data ${15 + mask}
.data ${Assembler.unsignedToSigned(255 + mask)}
.data ${output + mask}
.data ${mask}
.data -6
.data -1
`
                ));

                return result;
            },

            getExpectedOutput: input => input.map(seq => {
                const input = String.fromCharCode(...seq.slice(0, seq.length - 1)).split("\n");
                const result = [];
                const emulator = new Emulator(Assembler.assemble(input), {
                    writeOutput: n => {
                        result.push(n);
                    },
                });

                let step = 0;
                while (step++ < 50 && emulator.isRunning()) {
                    emulator.step();
                }

                return result;
            }),
        },
        io: [
            [stringToNumbers(
                // ; Outputs its own first 12 bytes of code (negated)
                //
                // @start:
                // subleq @OUT @start
                // subleq @start+1 @n_1
                // subleq @count @n_1 @start
                // subleq @zero @zero @HALT
                
                // @n_1: .data -1
                // .data 1
                // @count: .data -11
                // @zero: .data 0
                
                `subleq 254 0 3
                subleq 1 12 6
                subleq 14 12 0
                subleq 15 15 255
                .data -1
                .data 1
                .data -11
                .data 0
                `
                ),
                [2, -1, -3, -1, -12, -6, -14, -12, 0, -15, -15, 1],
            ],
        ],
    },
] as const;

const titleToPuzzleInternal: { [title: string]: Puzzle } = {};
for (const puzzle of puzzleFlatArray) {
    titleToPuzzleInternal[puzzle.title] = puzzle;
}

export const titleToPuzzle = titleToPuzzleInternal;
export const puzzleCount = puzzleFlatArray.length;
