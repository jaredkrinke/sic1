// Instruction:
// subleq a b c -- set memory location "a" to "a - b" and if the result is <= 0, jump to memory location "c"

// TODO: Allow the third argument to be optional
// TODO: File IO

var subleqInstructionName = "subleq";
var subleqInstructionSize = 3; // bytes
function isValidNumber(str) {
    var value = parseInt(str);
    return value !== NaN && value >= 0 && value <= 0xff;
}

function stringifyArgument(value) {
    return value.toString();
}

function parseArgument(str) {
    if (isValidNumber(str)) {
        return parseInt(str);
    } else {
        throw "Invalid argument: " + str + " (must be an integer on the range [0, 255])";
    }
}


function assembleInstruction(str) {
    var tokens = str.split(/\s+/);
    var instructionName = tokens[0];
    if (instructionName !== subleqInstructionName) {
        throw "Unknown instruction name: " + instructionName + " (only valid instruction name is \"" + subleqInstructionName + "\")";
    }

    var arguments = [];
    for (var i = 1; i < tokens.length; i++) {
        arguments.push(parseArgument(tokens[i]));
    }

    if (arguments.length < 3 || arguments.length > 3) {
        throw "Invalid number of arguments: " + arguments.length + " (must be either 3 arguments)";
    }

    // Find the specific opcode by looking at argument types
    var word = 0;
    for (var i = 0; i < subleqInstructionSize; i++) {
        word |= (arguments[i] << (8 * i));
    }

    return word;
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
    var str = subleqInstructionName;
    for (var i = 0; i < subleqInstructionSize; i++) {
        str += " " + ((word >> (8 * i)) & 0xff);
    }

    return str;
}

// Main
if (process.argv.length == 4) {
    var command = process.argv[2];
    var argument = process.argv[3];
    if (command === "encode") {
        console.log(assembleInstruction(argument).toString(16));
    } else if (command === "decode") {
        console.log(disassembleInstruction(parseInt(argument, 16)));
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
