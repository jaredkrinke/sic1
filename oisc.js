// Assembly language:
// subleq a b c     set memory location "a" to "(value at a) - (value at b)" and if the result is <= 0, jump to memory location "c"
// byte x           raw signed byte of data (note: this isn't interpreted any differently from subleq if executed)

// TODO: Allow the third argument to be optional
// TODO: File IO
// TODO: What to do about out of range errors?
// TODO: How to handle raw data, input/output, halting?

var byteDirective = "byte";
var subleqInstruction = "subleq";
var subleqInstructionSize = 3; // bytes
var valueMin = -128;
var valueMax = 127;
var addressMin = 0;
var addressMax = 255;

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
    byteDirective
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

function assembleLine(str) {
    var tokens = str.split(/\s+/);
    var instructionName = tokens[0];
    var instruction = Identifier[instructionName];
    var argumentCount = tokens.length - 1;
    var bytes = [];
    switch (instruction) {
        case Identifier.subleq:
        {
            if (argumentCount !== 3) {
                throw "Invalid number of arguments for " + instructionName + ": " + argumentCount + " (must be 3 arguments)";
            }
            
            bytes.push(parseAddress(tokens[1]));
            bytes.push(parseAddress(tokens[2]));
            bytes.push(parseAddress(tokens[3]));
        }
        break;

        case Identifier.data:
        {
            if (argumentCount !== 1) {
                throw "Invalid number of arguments for " + instructionName + ": " + argumentCount + " (must be 1 argument)";
            }
            
            bytes.push(parseValue(tokens[1]));
        }
        break;

        default:
        throw "Unknown instruction name: " + instructionName;
    }

    return bytes;
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

function hexifyBytes(bytes) {
    var str = ""
    for (var i = 0; i < bytes.length; i++) {
        str += hexifyAddress(bytes[i]);
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
//             var word = assembleLine(line);
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
//         str += disassembleBytes(word);
//         str += "\n";
//     }
//     return str;
// }

function disassembleBytes(bytes) {
    return subleqInstruction
        + " " + stringifyValue(bytes[0])
        + " " + stringifyValue(bytes[1])
        + " " + stringifyAddress(bytes[2]);
}

// Main
if (process.argv.length == 4) {
    var command = process.argv[2];
    var argument = process.argv[3];
    if (command === "encode") {
        console.log(hexifyBytes(assembleLine(argument)));
    } else if (command === "decode") {
        console.log(disassembleBytes(unhexifyBytes(argument)));
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
