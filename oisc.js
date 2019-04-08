var oisc = require("./oisc-lib.js");

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

function disassembleBytes(bytes) {
    // Note: This only supports subleq instructions
    return subleqInstruction
        + " " + stringifyAddress(bytes[0])
        + " " + stringifyAddress(bytes[1])
        + " " + stringifyAddress(bytes[2]);
}

// Main
var success = false;
var arguments = process.argv.slice(2);
if (arguments.length >= 2) {
    var command = arguments[0];
    var argument = arguments[1];
    switch (command) {
        case "encode":
        console.log(hexifyBytes((new oisc.Parser()).assembleLine(argument).expressions));
        success = true;
        break;
    
        case "decode":
        console.log(disassembleBytes(unhexifyBytes(argument)));
        success = true;
        break;
    
        case "assemble":
        console.log(hexifyBytes((new oisc.Parser()).assemble(readFileLines(argument)).bytes));
        success = true;
        break;
    
        case "run":
        if (arguments.length >= 3) {
            var argument = process.argv[3];
            var input = readFileLines(process.argv[4])
                .map(function (a) { return parseInt(a); });
        
            var inputIndex = 0;
        
            var interpreter = new oisc.Interpreter(
                (new oisc.Parser()).assemble(readFileLines(argument)),
                {
                    readInput: function () {
                        // TODO: Return -1 instead? Some other magic value? Terminate after next output?
                        return (inputIndex < input.length) ? input[inputIndex++] : 0;
                    },

                    writeOutput: function (value) {
                        console.log(value);
                    },

                    onHalt: function (cyclesExecuted, bytesAccessed) {
                        console.log("");
                        console.log("Execution halted.");
                        console.log("  Cycles executed: " + cyclesExecuted);
                        console.log("  Bytes accessed:  " + bytesAccessed);
                    }
                });
        
            interpreter.run();
            success = true;
        }
        break;
    }
}

if (!success) {
    console.log("USAGE: <program> <encode/decode/assemble/run> <instruction/source file> [input file]");
}
