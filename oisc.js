// Assembly language:
// subleq a b [c]     set memory location "a" to "(value at a) - (value at b)" and if the result is <= 0, jump to memory location "c" (if provided)
// .byte x           raw signed byte of data (note: this isn't interpreted any differently from subleq if executed)

// TODO: Allow the third argument to be optional
// TODO: File IO
// TODO: What to do about out of range errors?
// TODO: How to handle raw data, input/output, halting?

var dataDirective = ".data";
var commentDelimiter = ";";
var subleqInstruction = "subleq";
var subleqInstructionSize = 3; // bytes
var valueMin = -128;
var valueMax = 127;
var addressMin = 0;
var addressMax = 255;

var addressInput = 253;
var addressOutput = 254;
var addressHalt = 255;

function createEnum(values) {
    var o = {
        _names: []
    };

    for (var i = 0; i < values.length; i++) {
        var index = i + 1;
        o[values[i]] = index;
        o._names[index] = values[i];
    }

    return o;
}

var Identifier = createEnum([
    subleqInstruction,
    dataDirective
]);

function isValidNumber(str, min, max) {
    var value = parseInt(str);
    return value !== NaN && value >= min && value <= max;
}

function isValidValue(str) {
    return isValidNumber(str, valueMin, valueMax);
}

function isValidAddress(str) {
    return isValidNumber(str, addressMin, addressMax);
}

function stringifyValue(value) {
    return value.toString();
}

function stringifyAddress(value) {
    return value.toString();
}

function parseValue(str) {
    if (isValidValue(str)) {
        return parseInt(str);
    } else {
        throw "Invalid argument: " + str + " (must be an integer on the range [" + valueMin + ", " + valueMax + "])";
    }
}

function parseAddress(str) {
    if (isValidAddress(str)) {
        return parseInt(str);
    } else {
        throw "Invalid argument: " + str + " (must be an integer on the range [" + addressMin + ", " + addressMax + "])";
    }
}

function Parser() {
    this.address = 0;
    this.symbols = {};

    this.symbols["@IN"] = addressInput;
    this.symbols["@OUT"] = addressOutput;
    this.symbols["@HALT"] = addressHalt;
}

var identifierPattern = "[_a-zA-Z][_a-zA-Z0-9]*";
var instructionPattern = ".?" + identifierPattern;
var numberPattern = "-?[0-9]+";
var referencePattern = "@" + identifierPattern;
var expressionPattern = "(" + numberPattern + "|" + referencePattern + ")";
var linePattern = "^((" + referencePattern + ")\\s*:)?\\s*((" + instructionPattern + ")(\\s+" + expressionPattern + "\\s*(,\\s+" + expressionPattern + "\\s*)*)?)?(\\s*;.*)?";
var lineRegExp = new RegExp(linePattern);

Parser.prototype.parseExpression = function (str) {
    if (str[0] === "@") {
        // TODO: Allow using references before they're defined
        var address = this.symbols[str];
        if (address === undefined) {
            throw "Unknown reference: " + str;
        }

        return address;
    } else {
        return parseAddress(str);
    }
};

Parser.prototype.assembleLine = function (str) {
    var groups = lineRegExp.exec(str);
    if (!groups) {
        throw "Invalid syntax: " + str;
    }

    var instructionName = groups[4];

    var bytes = [];
    if (instructionName) {
        // Update symbol table
        var label = groups[2];
        if (label) {
            if (this.symbols[label]) {
                throw "Symbol already defined: " + label + " (" + this.symbols[label] + ")";
            }

            this.symbols[label] = this.address;
        }

        // Parse argument list
        var arguments = (groups[5] || "")
            .split(",")
            .map(function (a) { return a.trim(); });

        var instruction = Identifier[instructionName];
        switch (instruction) {
            case Identifier[subleqInstruction]:
            {
                if (arguments.length < 2 || arguments.length > 3) {
                    throw "Invalid number of arguments for " + instructionName + ": " + arguments.length + " (must be 2 or 3 arguments)";
                }
    
                var nextAddress = this.address + subleqInstructionSize;
                
                bytes.push(this.parseExpression(arguments[0]));
                bytes.push(this.parseExpression(arguments[1]));
    
                if (arguments.length >= 3) {
                    bytes.push(this.parseExpression(arguments[2]));
                } else {
                    bytes.push(nextAddress);
                }
    
                this.address = nextAddress;
            }
            break;
    
            case Identifier[dataDirective]:
            {
                if (arguments.length !== 1) {
                    throw "Invalid number of arguments for " + instructionName + ": " + arguments.length + " (must be 1 argument)";
                }
                
                bytes.push(parseValue(arguments[0]));
            }
            break;
    
            default:
            throw "Unknown instruction name: " + instructionName;
        }
    }

    return bytes;
};

Parser.prototype.assemble = function (lines) {
    var bytes = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.length > 0) {
            var lineBytes = this.assembleLine(line);
            for (var j = 0; j < lineBytes.length; j++) {
                bytes.push(lineBytes[j]);
            }
        }
    }
    return bytes;
};

function hexifyByte(v) {
    // Note: The "byte" can be signed or unsigned; propagate sign bit down here, as needed
    var a = Math.abs(v);
    a |= (v < 0) ? 0x80 : 0x00;
    var str = a.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

function hexifyBytes(bytes) {
    var str = ""
    for (var i = 0; i < bytes.length; i++) {
        str += hexifyByte(bytes[i]);
    }
    return str;
}

function unhexifyBytes(str) {
    if (str.length % 2 !== 0) {
        throw "Invalid hex string length: " + str.length + " (must be even)";
    }

    bytes = [];
    for (var i = 0; i < str.length / 2; i++) {
        bytes[i] = parseInt(str.substr(i * 2, 2), 16);
    }

    return bytes;
}

var fs = require("fs");
function readFileLines(file) {
    return fs.readFileSync(file).toString().split(/\r?\n\r?/);
}

// function readFileBytes(file) {
//     var buffer = fs.readFileSync(file);
//     var bytes = [];
//     for (byte of buffer) {
//         bytes.push(byte);
//     }
//     return bytes;
// }

function outputBytes(bytes) {
    process.stdout.write(Buffer.from(bytes));
}

// function disassemble(bytes) {
//     // Pad to ensure three byte alignment
//     while (bytes.length % 3 != 0) {
//         bytes.push(0);
//     }

//     var str = "";
//     for (var i = 0; i < bytes.length; i += subleqInstructionSize) {
//         var word = 0;
//         for (var j = 0; j < subleqInstructionSize; j++) {
//             word |= (bytes[i + j] << 8 * j);
//         }
//         str += disassembleBytes(word);
//         str += "\n";
//     }
//     return str;
// }

function disassembleBytes(bytes) {
    // Note: This only supports subleq instructions
    return subleqInstruction
        + " " + stringifyAddress(bytes[0])
        + " " + stringifyAddress(bytes[1])
        + " " + stringifyAddress(bytes[2]);
}

function Interpreter(bytes, read, write, done) {
    // TODO: Limit program size to 253 bytes!

    // Callbacks
    this.read = read;
    this.write = write;
    this.done = done;

    // State
    this.halted = false;
    this.ip = 0;

    // Memory
    this.memory = [].fill(0, 0, 255);
    var i;
    for (i = 0; i < bytes.length; i++) {
        this.memory[i] = bytes[i];
    }
    for (; i <= addressMax; i++) {
        this.memory[i] = 0;
    }
}

Interpreter.prototype.step = function () {
    if (this.ip >= 0 && (this.ip + subleqInstructionSize) < this.memory.length) {
        var a = this.memory[this.ip++];
        var b = this.memory[this.ip++];
        var c = this.memory[this.ip++];

        // Read operands
        var av = (a === addressOutput) ? 0 : this.memory[a];
        var bv = (b === addressInput) ? this.read() : this.memory[b];

        // Arithmetic
        // TODO: Handle underflow
        var result = av - bv;

        // Write result
        if (a === addressOutput) {
            this.write(result);
        } else {
            this.memory[a] = result;
        }

        // Branch, if necessary
        if (result <= 0) {
            this.ip = c;
        }
    } else {
        this.halted = true;
        this.done();
    }
};

Interpreter.prototype.run = function () {
    // TODO: Prevent infinite loops?
    while (!this.halted) {
        this.step();
    }
};

// Main
var command = process.argv[2];
if (process.argv.length == 4) {
    var argument = process.argv[3];
    if (command === "encode") {
        console.log(hexifyBytes((new Parser()).assembleLine(argument)));
    } else if (command === "decode") {
        console.log(disassembleBytes(unhexifyBytes(argument)));
    } else if (command === "assemble") {
        outputBytes(hexifyBytes((new Parser()).assemble(readFileLines(argument))));
    // } else if (command === "assemble_hex") {
    //     console.log(assembleToString(assemble(readFileLines(argument))));
    // } else if (command === "disassemble") {
    //     console.log(disassemble(readFileBytes(argument)));
    }
} else if (command === "run" && process.argv.length === 5) {
    var argument = process.argv[3];
    var input = readFileLines(process.argv[4])
        .map(function (a) { return parseValue(a); });

    var inputIndex = 0;

    var interpreter = new Interpreter(
        (new Parser()).assemble(readFileLines(argument)),
        function () {
            // Read
            // TODO: Return -1 instead? Some other magic value? Terminate after next output?
            return (inputIndex < input.length) ? input[inputIndex++] : 0;
        },
        function (value) {
            // Write
            console.log(value);
        },
        function () {
            // Done
        });

    interpreter.run();
} else {
    console.log("USAGE: <program> <encode/decode/assemble/run> <instruction/source file> [input file]");
}
