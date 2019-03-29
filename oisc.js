// Instruction:
// subleq a b c -- set memory location "a" to "a - b" and if the result is <= 0, jump to memory location "c"

// TODO: Allow the third argument to be optional
// TODO: File IO
// TODO: What to do about out of range errors?
// TODO: How to handle raw data, input/output, halting?

var subleqInstructionName = "subleq";
var subleqInstructionSize = 3; // bytes
var valueMin = -128;
var valueMax = 127;
var addressMin = 0;
var addressMax = 255;

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

function assembleInstruction(str) {
    var tokens = str.split(/\s+/);
    var instructionName = tokens[0];
    if (instructionName !== subleqInstructionName) {
        throw "Unknown instruction name: " + instructionName + " (only valid instruction name is \"" + subleqInstructionName + "\")";
    }

    var argumentCount = tokens.length - 1;
    if (argumentCount < 3 || argumentCount > 3) {
        throw "Invalid number of arguments: " + argumentCount + " (must be 3 arguments)";
    }

    return [
        parseValue(tokens[1]),
        parseValue(tokens[2]),
        parseAddress(tokens[3])
    ];
}

function hexifyValue(v) {
    var a = Math.abs(v);
    a |= (v < 0) ? 0x80 : 0x00;
    var str = a.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

function hexifyAddress(v) {
    str = v.toString(16);
    if (str.length == 1) {
        str = "0" + str;
    }
    return str;
}

function hexifyInstruction(arguments) {
    return hexifyValue(arguments[0])
        + hexifyValue(arguments[1])
        + hexifyAddress(arguments[2]);
}

function unhexifyInstruction(str) {
    var word = parseInt(str, 16);
    return [
        (word >> 16) & 0xff,
        (word >> 8) & 0xff,
        word & 0xff
    ];
}

// var fs = require("fs");

// function readFileLines(file) {
//     return fs.readFileSync(file).toString().split(/\r?\n\r?/);
// }

// function readFileBytes(file) {
//     var buffer = fs.readFileSync(file);
//     var bytes = [];
//     for (byte of buffer) {
//         bytes.push(byte);
//     }
//     return bytes;
// }

// function outputBytes(bytes) {
//     process.stdout.write(Buffer.from(bytes));
// }

// function assemble(lines) {
//     var bytes = [];
//     for (var i = 0; i < lines.length; i++) {
//         var line = lines[i];
//         if (line.length > 0) {
//             var word = assembleInstruction(line);
//             bytes.push(word >> 8);
//             bytes.push(word & 0xff);
//         }
//     }
//     return bytes;
// }

// function assembleToString(bytes) {
//     var str = "";
//     for (var i = 0; i < bytes.length; i++) {
//         var byteString = bytes[i].toString(16);
//         if (byteString.length < 2) {
//             str += "0";
//         }
//         str += byteString;
//     }
//     return str;
// }

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
//         str += disassembleInstruction(word);
//         str += "\n";
//     }
//     return str;
// }

function disassembleInstruction(word) {
    return subleqInstructionName
        + " " + stringifyValue(word[0])
        + " " + stringifyValue(word[1])
        + " " + stringifyAddress(word[2]);
}

// Main
if (process.argv.length == 4) {
    var command = process.argv[2];
    var argument = process.argv[3];
    if (command === "encode") {
        console.log(hexifyInstruction(assembleInstruction(argument)));
    } else if (command === "decode") {
        console.log(disassembleInstruction(unhexifyInstruction(argument)));
    // } else if (command === "assemble") {
    //     outputBytes(assemble(readFileLines(argument)));
    // } else if (command === "assemble_hex") {
    //     console.log(assembleToString(assemble(readFileLines(argument))));
    // } else if (command === "disassemble") {
    //     console.log(disassemble(readFileBytes(argument)));
    }
} else {
    console.log("USAGE: <program> <assemble/disassemble> <instruction>");
}
