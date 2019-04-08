(function (exports) {
    // Assembly language:
    // TODO: Update
    // subleq a b [c]     set memory location "a" to "(value at a) - (value at b)" and if the result is <= 0, jump to memory location "c" (if provided)
    // .data x           raw signed byte of data (note: this isn't interpreted any differently from subleq if executed)

    var dataDirective = ".data";
    var commentDelimiter = ";";
    var subleqInstruction = "subleq";
    var subleqInstructionSize = 3; // bytes
    var valueMin = -128;
    var valueMax = 127;
    var addressMin = 0;
    var addressMax = 255;

    var addressUserMax = 252;
    var addressInput = 253;
    var addressOutput = 254;
    var addressHalt = 255;

    // Custom error type
    function CompilationError(message) {
        this.name = "CompilationError";
        this.message = message || "";
    }

    CompilationError.prototype = Object.create(Error.prototype);

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

    function signedToUnsigned(signed) {
        return signed & 0xff;
    }

    function unsignedToSigned(unsigned) {
        var signed = unsigned & 0x7f;
        signed += (unsigned & 0x80) ? -128 : 0;
        return signed;
    }

    function parseValue(str) {
        if (isValidValue(str)) {
            return parseInt(str);
        } else {
            throw new CompilationError("Invalid argument: " + str + " (must be an integer on the range [" + valueMin + ", " + valueMax + "])");
        }
    }

    function parseAddress(str) {
        if (isValidAddress(str)) {
            return parseInt(str);
        } else {
            throw new CompilationError("Invalid argument: " + str + " (must be an integer on the range [" + addressMin + ", " + addressMax + "])");
        }
    }

    function Parser() {
        this.address = 0;
        this.symbols = {};
        this.addressToSymbol = [];

        this.symbols["@MAX"] = addressUserMax;
        this.symbols["@IN"] = addressInput;
        this.symbols["@OUT"] = addressOutput;
        this.symbols["@HALT"] = addressHalt;
    }

    var identifierPattern = "[_a-zA-Z][_a-zA-Z0-9]*";
    var instructionPattern = ".?" + identifierPattern;
    var numberPattern = "-?[0-9]+";
    var referencePattern = "@" + identifierPattern;
    var referenceExpressionPattern = "(" + referencePattern + ")([+-][0-9]+)?";
    var expressionPattern = "(" + numberPattern + "|" + referenceExpressionPattern + ")";
    var linePattern = "^\\s*((" + referencePattern + ")\\s*:)?\\s*((" + instructionPattern + ")(\\s+" + expressionPattern + "\\s*(,\\s+" + expressionPattern + "\\s*)*)?)?(\\s*;.*)?";

    var referenceExpressionRegExp = new RegExp(referenceExpressionPattern);
    var lineRegExp = new RegExp(linePattern);

    Parser.prototype.parseExpression = function (str) {
        if (str[0] === "@") {
            // Resolve in second pass of assembler
            return str;
        } else {
            return parseAddress(str);
        }
    };

    Parser.prototype.assembleLine = function (str) {
        var groups = lineRegExp.exec(str);
        if (!groups) {
            throw new CompilationError("Invalid syntax: " + str);
        }

        // Update symbol table
        var label = groups[2];
        if (label) {
            if (this.symbols[label]) {
                throw new CompilationError("Symbol already defined: " + label + " (" + this.symbols[label] + ")");
            }

            this.symbols[label] = this.address;
            this.addressToSymbol[this.address] = label;
        }

        var expressions = [];
        var instructionName = groups[4];
        var instruction
        if (instructionName) {
            // Parse argument list
            var arguments = (groups[5] || "")
                .split(",")
                .map(function (a) { return a.trim(); });

            var nextAddress = this.address;
            instruction = Identifier[instructionName];
            switch (instruction) {
                case Identifier[subleqInstruction]:
                {
                    if (arguments.length < 2 || arguments.length > 3) {
                        throw new CompilationError("Invalid number of arguments for " + instructionName + ": " + arguments.length + " (must be 2 or 3 arguments)");
                    }
        
                    nextAddress += subleqInstructionSize;

                    expressions.push(this.parseExpression(arguments[0]));
                    expressions.push(this.parseExpression(arguments[1]));
                    expressions.push((arguments.length >= 3) ? this.parseExpression(arguments[2]) : nextAddress);
                }
                break;
        
                case Identifier[dataDirective]:
                {
                    if (arguments.length !== 1) {
                        throw new CompilationError("Invalid number of arguments for " + instructionName + ": " + arguments.length + " (must be 1 argument)");
                    }
                    
                    nextAddress++;
                    expressions.push(signedToUnsigned(parseValue(arguments[0])));
                }
                break;
        
                default:
                throw new CompilationError("Unknown instruction name: " + instructionName);
            }

            this.address = nextAddress;
        }

        return {
            instruction: instruction,
            expressions: expressions
        };
    };

    Parser.prototype.assemble = function (lines) {
        // Correlate address to source line
        var sourceMap = [];

        // Parse expressions (note: this can include unresolved references)
        var expressions = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length > 0) {
                var previousAddress = this.address;
                var assembledLine = this.assembleLine(line);
                var lineExpressions = assembledLine.expressions;
                for (var j = 0; j < lineExpressions.length; j++) {
                    expressions.push(lineExpressions[j]);
                }

                if (previousAddress !== this.address) {
                    sourceMap[previousAddress] = {
                        lineNumber: i,
                        instruction: assembledLine.instruction,
                        source: line
                    };
                }
            }
        }

        // Resolve all values
        var bytes = [];
        for (var i = 0; i < expressions.length; i++) {
            var expression = expressions[i];
            if (typeof(expression) === "string") {
                var groups = referenceExpressionRegExp.exec(expression);
                var label = groups[1];
                var offset = groups[2];
                expression = this.symbols[label];
                if (expression === undefined) {
                    throw new CompilationError("Undefined reference: " + label);
                }

                if (offset) {
                    expression += parseInt(offset);
                }
            }

            if (expression < 0 || expression > addressMax) {
                throw new CompilationError("Address \"" + expressions[i] + "\" (" + expression + ") is outside of valid range of [0, 255]");
            }

            bytes.push(expression);
        }

        var variables = [];
        for (var i = 0; i < sourceMap.length; i++) {
            if (sourceMap[i] && sourceMap[i].instruction === Identifier[dataDirective]) {
                variables.push([
                    this.addressToSymbol[i],
                    i
                ]);
            }
        }

        return {
            bytes: bytes,
            sourceMap: sourceMap,
            variables: variables
        };
    };

    function Interpreter(program, callbacks) {
        // TODO: Limit program size to 253 bytes!
        this.program = program;
        this.callbacks = callbacks;

        // State
        this.running = true;
        this.ip = 0;

        // Memory
        this.memory = [];
        var i;
        var bytes = this.program.bytes;
        for (i = 0; i <= addressMax; i++) {
            var value = (i < bytes.length) ? bytes[i] : 0;
            this.memory[i] = value;

            if (this.callbacks.onWriteMemory) {
                this.callbacks.onWriteMemory(i, value);
            }
        }

        // Metrics

        // Memory access
        this.memoryAccessed = [];
        this.memoryBytesAccessed = 0;

        // Cycle count
        this.cyclesExecuted = 0;

        // Emit initial state info
        this.stateUpdated();
    }

    Interpreter.prototype.stateUpdated = function () {
        if (this.callbacks.onStateUpdated) {
            // Find source info in source map
            var sourceMap = this.program.sourceMap;
            var ip = this.ip;
            var sourceLineNumber = 0;
            var source = "?";
            var sourceMapEntry = sourceMap[ip];
            if (sourceMapEntry) {
                // Exact match in the source map
                sourceLineNumber = sourceMapEntry.lineNumber;
                source = sourceMapEntry.source;
            } else {
                // No match in the source map; use the previous line number
                for (var i = ip; i >= 0; i--) {
                    var previousEntry = sourceMap[i];
                    if (previousEntry) {
                        sourceLineNumber = previousEntry.lineNumber;
                        break;
                    }
                }
            }

            var variables = [];
            for (var i = 0; i < this.program.variables.length; i++) {
                variables.push({
                    label: this.program.variables[i][0],
                    value: unsignedToSigned(this.memory[this.program.variables[i][1]])
                });
            }

            this.callbacks.onStateUpdated(
                this.running,
                ip,
                this.memory[ip],
                sourceLineNumber,
                source,
                this.cyclesExecuted,
                this.memoryBytesAccessed,
                variables
            );
        }
    };

    Interpreter.prototype.accessMemory = function (address) {
        if (this.memoryAccessed[address] !== 1) {
            this.memoryBytesAccessed++;
        }

        this.memoryAccessed[address] = 1;
    };

    Interpreter.prototype.readMemory = function (address) {
        this.accessMemory(address);
        return this.memory[address];
    };

    Interpreter.prototype.writeMemory = function (address, value) {
        this.accessMemory(address);
        this.memory[address] = value;
        if (this.callbacks.onWriteMemory) {
            this.callbacks.onWriteMemory(address, value);
        }
    };

    Interpreter.prototype.isRunning = function () {
        return this.ip >= 0 && (this.ip + subleqInstructionSize) < this.memory.length;
    };

    Interpreter.prototype.step = function () {
        if (this.isRunning()) {
            var a = this.readMemory(this.ip++);
            var b = this.readMemory(this.ip++);
            var c = this.readMemory(this.ip++);

            // Read operands
            var av = this.readMemory(a);
            var bv = 0;
            if (b === addressInput) {
                this.accessMemory(addressInput);
                if (this.callbacks.readInput) {
                    bv = this.callbacks.readInput();
                }
            } else {
                bv = this.readMemory(b);
            }

            // Arithmetic (wraps around on overflow)
            var result = (av - bv) & 0xff;

            // Write result
            var resultSigned = unsignedToSigned(result);
            if (a === addressOutput) {
                this.accessMemory(addressOutput);
                if (this.callbacks.writeOutput) {
                    this.callbacks.writeOutput(resultSigned);
                }
            } else {
                this.writeMemory(a, result);
            }

            // Branch, if necessary
            if (resultSigned <= 0) {
                this.ip = c;
            }

            this.cyclesExecuted++;
            this.running = this.isRunning();
            this.stateUpdated();

            if (this.callbacks.onHalt && !this.running) {
                this.callbacks.onHalt(this.cyclesExecuted, this.memoryBytesAccessed);
            }
        }
    };

    Interpreter.prototype.run = function () {
        // TODO: Prevent infinite loops?
        while (this.running) {
            this.step();
        }
    };

    exports.Parser = Parser;
    exports.Interpreter = Interpreter;
    exports.CompilationError = CompilationError;
})(this);
