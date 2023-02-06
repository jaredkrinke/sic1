// Valid tokens
export const Syntax = {
    subleqInstruction: "subleq",
    dataDirective: ".data",
    referencePrefix: "@",
    commentDelimiter: ";",
    optionalArgumentSeparater: ",",
};

const addressMax = 255;
const subleqInstructionBytes = 3;

export const Constants = {
    // Valid values
    valueMin: -128,
    valueMax: 127,

    // Valid addresses
    addressMin: 0,
    addressInstructionMax: addressMax - subleqInstructionBytes,
    addressMax,

    // Built-in addresses
    addressUserMax: 252,
    addressInput: 253,
    addressOutput: 254,
    addressHalt: 255,

    subleqInstructionBytes,
} as const;

const CompilationErrorTypes = [
    "SyntaxError",
    "AddressError",
    "ValueError",
    "LabelError",
    "ReferenceError",
    "SizeError",
    "InternalError",
] as const;

export type CompilationErrorType = typeof CompilationErrorTypes[number];

// Custom error type
export interface CompilationContext {
    sourceLineNumber: number;
    sourceLine: string;
}

export class CompilationError extends Error {
    constructor(public errorType: CompilationErrorType, message: string, public context?: CompilationContext) {
        super(message);

        // Ensure prototype is CompilationError
        Object.setPrototypeOf(this, CompilationError.prototype);
    }
}

export enum Command {
    subleqInstruction,
    dataDirective
}

export interface LabelReference {
    label: string;
    negated?: boolean;
    offset: number;
    context: CompilationContext;
}

export type Expression = LabelReference | number;

export interface ParsedLine {
    label?: string;
    command?: Command;
    expressions?: Expression[];
}

export interface SourceMapEntry {
    lineNumber: number;
    command: Command;
    source: string;
}

export interface VariableDefinition {
    label: string;
    address: number;
}

export interface AssembledProgram {
    bytes: number[];
    sourceMap: SourceMapEntry[];
    variables: VariableDefinition[];
}

export enum TokenType {
    label,
    command,

    // Expressions
    numberLiteral,
    characterLiteral,
    reference,
    stringLiteral,

    // Syntax
    comma,

    // Ignored
    whiteSpace,
    comment,
}

interface TokenGroups {
    [key: string]: string;
}

export interface Token {
    tokenType: TokenType;
    groups?: TokenGroups;
    raw: string;
}

interface TokenizerRuleDefinition {
    tokenType: TokenType;
    pattern: string;
    groups?: string[];
    discard?: boolean;
}

interface TokenizerRule {
    tokenType: TokenType;
    regExp: RegExp;
    groups?: string[];
    discard?: boolean;
}

export class Tokenizer {
    private static readonly commandPattern = "[_a-zA-Z][_a-zA-Z0-9]*";
    private static readonly identifierPattern = "[_a-zA-Z0-9]+";
    private static readonly numberWithoutSignPattern = "[0-9]+";
    private static readonly printableCharacterPattern = "[ -~]";
    private static readonly printableCharactersExceptApostropheAndBackslashPattern = "[ -&(-[\\]-~]";
    private static readonly printableCharactersExceptQuoteAndBackslashPattern = "[ !#-[\\]-~]";
    private static readonly referencePattern = `${Syntax.referencePrefix}(${Tokenizer.identifierPattern})`;

    private static readonly ruleDefinitions: TokenizerRuleDefinition[] = [
        { tokenType: TokenType.whiteSpace, pattern: "\\s+", discard: true },
        { tokenType: TokenType.comma, pattern: Syntax.optionalArgumentSeparater },
        { tokenType: TokenType.command, pattern: `[.]?${Tokenizer.commandPattern}` },
        { tokenType: TokenType.numberLiteral, pattern: `-?${Tokenizer.numberWithoutSignPattern}` },
        { tokenType: TokenType.characterLiteral, pattern: `-?'(${Tokenizer.printableCharactersExceptApostropheAndBackslashPattern}|\\\\${Tokenizer.printableCharacterPattern})'`, groups: ["character"] },
        { tokenType: TokenType.stringLiteral, pattern: `-?"((${Tokenizer.printableCharactersExceptQuoteAndBackslashPattern}|\\\\${Tokenizer.printableCharacterPattern})*)"`, groups: ["characters"] },
        { tokenType: TokenType.label, pattern: `${Tokenizer.referencePattern}:`, groups: ["name"] },
        { tokenType: TokenType.reference, pattern: `(-?)${Tokenizer.referencePattern}([+-]${Tokenizer.numberWithoutSignPattern})?`, groups: ["negation", "name", "offset"] },
        { tokenType: TokenType.comment, pattern: `${Syntax.commentDelimiter}.*$`, discard: true },
    ];

    private static readonly rules: TokenizerRule[] = Tokenizer.ruleDefinitions.map(def => Tokenizer.createRule(def));

    private static createRule(definition: TokenizerRuleDefinition): TokenizerRule {
        return {
            tokenType: definition.tokenType,
            regExp: new RegExp(`^${definition.pattern}`),
            groups: definition.groups,
            discard: definition.discard,
        };
    }

    private static createToken(rule: TokenizerRule, matchedGroups: RegExpExecArray): Token {
        const token: Token = {
            tokenType: rule.tokenType,
            raw: matchedGroups[0],
        };

        let groups: TokenGroups | undefined;
        if (rule.groups) {
            groups = {};
            for (let i = 0; i < rule.groups.length; i++) {
                if (i + 1 < matchedGroups.length && matchedGroups[i + 1]) {
                    groups[rule.groups[i]] = matchedGroups[i + 1];
                }
            }
            token.groups = groups;
        }

        return token;
    }

    public static tokenizeLine(line: string, context?: CompilationContext): Token[] {
        const tokens: Token[] = [];
        while (line.length > 0) {
            let matched = false;
            for (const rule of Tokenizer.rules) {
                const matchedGroups = rule.regExp.exec(line);
                if (matchedGroups) {
                    // Discard whitespace, comments, etc.
                    if (rule.discard !== true) {
                        tokens.push(Tokenizer.createToken(rule, matchedGroups));
                    }

                    matched = true;
                    line = line.substr(matchedGroups[0].length);
                    break;
                }
            }

            if (!matched) {
                throw new CompilationError("SyntaxError", `Invalid token: ${line}`, context);
            }
        }
        return tokens;
    }
}

export class Assembler {
    private static readonly CommandStringToCommand: { [commandName: string]: Command } = {
        [Syntax.subleqInstruction]: Command.subleqInstruction,
        [Syntax.dataDirective]: Command.dataDirective,
    }

    private static isValidNumber(str: string, min: number, max: number): boolean {
        const value = parseInt(str);
        return !isNaN(value) && value >= min && value <= max;
    }

    private static isValidValue(str: string): boolean {
        return Assembler.isValidNumber(str, Constants.valueMin, Constants.valueMax);
    }

    private static isValidAddress(str: string): boolean {
        return Assembler.isValidNumber(str, Constants.addressMin, Constants.addressMax);
    }

    private static isLabelReference(expression: Expression): expression is LabelReference {
        return typeof(expression) === "object";
    }

    private static parseAddress(str: string, context: CompilationContext) : number {
        if (Assembler.isValidAddress(str)) {
            return parseInt(str);
        } else {
            throw new CompilationError("AddressError", `Invalid argument: ${str} (must be an integer on the range [${Constants.addressMin}, ${Constants.addressMax}])`, context);
        }
    }

    private static parseEscapeCode(escapeCharacter: string, context?: CompilationContext): string {
        switch (escapeCharacter) {
            case "0":
                return "\0";

            case "n":
                return "\n";

            case "\\":
            case "'":
            case '"':
                return escapeCharacter;

            default:
                throw new CompilationError("SyntaxError", `Invalid escape code: \"\\${escapeCharacter}\"`, context);
        }
    }

    private static parseReference(token: Token, context: CompilationContext): Expression {
        if (token.groups) {
            const { name, offset, negation } = token.groups;
            return {
                label: name,
                offset: offset ? parseInt(offset) : 0,
                ...((negation === "-" ? { negated: true } : {})),
                context,
            };
        }
        throw new CompilationError("InternalError", `Internal compiler error on token: ${token.raw}`, context);
    }

    private static parseValueExpression(token: Token, context: CompilationContext): Expression | number[] {
        switch (token.tokenType) {
            case TokenType.numberLiteral:
                return Assembler.parseValue(token, context);

            case TokenType.characterLiteral:
                return Assembler.parseCharacter(token, context);

            case TokenType.reference:
                return Assembler.parseReference(token, context);

            case TokenType.stringLiteral:
                return Assembler.parseString(token, context);

            default:
                throw new CompilationError("SyntaxError", `Expected number, character, string, or reference, but got: \"${token.raw}\"`, context);
        }
    }

    private static parseAddressExpression(token: Token, context: CompilationContext): Expression {
        switch (token.tokenType) {
            case TokenType.numberLiteral:
                return Assembler.parseAddress(token.raw, context);

            case TokenType.reference:
                return Assembler.parseReference(token, context);

            default:
                throw new CompilationError("SyntaxError", `Expected number literal or reference, but got: \"${token.raw}\"`, context);
        }
    }

    private static parseLineInternal(tokens: Token[], context: CompilationContext): ParsedLine {
        let index = 0;

        // Check for label
        let label: string | undefined = undefined;
        if (tokens.length > 0 && tokens[0].tokenType === TokenType.label && tokens[0].groups) {
            label = tokens[0].groups["name"];
            index++;
        }

        // Check for command
        let commandName: string | undefined;
        let command: Command | undefined;
        if (index < tokens.length) {
            commandName = tokens[index++].raw;
            command = Assembler.CommandStringToCommand[commandName];
        }

        // Collect arguments
        const commandArguments: Token[] = [];
        let firstArgument = true;
        while (index < tokens.length) {
            if (!firstArgument) {
                const token = tokens[index];
                if (token.tokenType === TokenType.comma) {
                    index++;
                }
            }

            if (index < tokens.length) {
                commandArguments.push(tokens[index++]);
            }

            firstArgument = false;
        }

        // Parse arguments
        let expressions: Expression[] | undefined;
        if (commandName) {
            switch (command) {
                case Command.subleqInstruction:
                {
                    if (commandArguments.length < 2 || commandArguments.length > 3) {
                        throw new CompilationError("SyntaxError", `Invalid number of arguments for ${commandName}: ${commandArguments.length} (must be 2 or 3 arguments)`, context);
                    }

                    expressions = [
                        Assembler.parseAddressExpression(commandArguments[0], context),
                        Assembler.parseAddressExpression(commandArguments[1], context)
                    ];

                    if (commandArguments.length >= 3) {
                        expressions.push(Assembler.parseAddressExpression(commandArguments[2], context));
                    }
                }
                break;

                case Command.dataDirective:
                {
                    if (commandArguments.length <= 0) {
                        throw new CompilationError("SyntaxError", `Invalid number of arguments for ${commandName}: ${commandArguments.length} (must have at least 1 argument)`, context);
                    }

                    expressions = [];
                    for (const commandArgument of commandArguments) {
                        const parsedValueExpression = Assembler.parseValueExpression(commandArgument, context);
                        if (Array.isArray(parsedValueExpression)) {
                            expressions.push(...parsedValueExpression);
                        } else {
                            expressions.push(parsedValueExpression);
                        }
                    }
                }
                break;

                default:
                throw new CompilationError("SyntaxError", `Unknown command: ${commandName} (valid commands are: ${Object.keys(Assembler.CommandStringToCommand).map(s => `"${s}"`).join(", ")})`, context);
            }
        }

        return {
            label,
            command,
            expressions,
        };
    };

    public static unsignedToSigned(unsigned: number): number {
        let signed = unsigned & 0x7f;
        signed += (unsigned & 0x80) ? -128 : 0;
        return signed;
    }

    public static signedToUnsigned(signed: number): number {
        return signed & 0xff;
    }

    public static parseValue(token: Token, context?: CompilationContext): number {
        const str = token.raw;
        if (Assembler.isValidValue(str)) {
            return Assembler.signedToUnsigned(parseInt(str));
        } else {
            throw new CompilationError("ValueError", `Invalid argument: ${str} (must be an integer on the range [${Constants.valueMin}, ${Constants.valueMax}])`, context);
        }
    }

    public static parseCharacter(token: Token, context?: CompilationContext): number {
        if (!token.groups) {
            throw new CompilationError("InternalError", `Internal compiler error on token: ${token.raw}`, context);
        }

        const str = token.groups.character;
        let value: number;
        if (str[0] === "\\") {
            value = Assembler.parseEscapeCode(str[1], context).charCodeAt(0);
        } else {
            value = str.charCodeAt(0);
        }

        if (token.raw[0] === "-") {
            value = Assembler.signedToUnsigned(-value);
        }

        return value;
    }

    public static parseString(token: Token, context?: CompilationContext): number[] {
        if (!token.groups) {
            throw new CompilationError("InternalError", `Internal compiler error on token: ${token.raw}`, context);
        }

        const input = token.groups.characters;
        const output: number[] = [];
        if (input) {
            for (let i = 0; i < input.length; i++) {
                const character = input[i];
                if (character === "\\") {
                    const escapeCharacter = input[++i];
                    output.push(Assembler.parseEscapeCode(escapeCharacter, context).charCodeAt(0));
                } else {
                    output.push(character.charCodeAt(0));
                }
            }

            // Negate, if needed
            if (token.raw[0] === "-") {
                for (let i = 0; i < output.length; i++) {
                    output[i] = Assembler.signedToUnsigned(-output[i]);
                }
            }
        }

        // Terminating zero
        output.push(0);

        return output;
    }

    public static parseLine(line: string) {
        const context = {
            sourceLineNumber: 1,
            sourceLine: line,
        };

        const tokens = Tokenizer.tokenizeLine(line, context);
        return Assembler.parseLineInternal(tokens, context);
    }

    public static assemble(lines: string[]): AssembledProgram {
        let address = 0;
        let labels: {[name: string]: number} = {};
        let addressToLabel = [];

        labels[`MAX`] = Constants.addressUserMax;
        labels[`IN`] = Constants.addressInput;
        labels[`OUT`] = Constants.addressOutput;
        labels[`HALT`] = Constants.addressHalt;

        // Correlate address to source line
        const sourceMap: SourceMapEntry[] = [];

        // Parse expressions (note: this can include unresolved references)
        const expressions: Expression[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length > 0) {
                const context: CompilationContext = {
                    sourceLineNumber: i + 1,
                    sourceLine: line,
                };

                const tokens = Tokenizer.tokenizeLine(line, context);
                const assembledLine = Assembler.parseLineInternal(tokens, context);

                // Add label, if present
                const label = assembledLine.label;
                if (label) {
                    if (labels[label] !== undefined) {
                        throw new CompilationError("LabelError", `Label already defined: ${label} (${labels[label]})`, context);
                    }

                    labels[label] = address;
                    addressToLabel[address] = label;
                }

                // Fill in optional addresses
                const lineExpressions = assembledLine.expressions;
                if (assembledLine.command !== undefined) {
                    if (lineExpressions) {
                        lineExpressions.forEach(e => expressions.push(e));

                        let nextAddress = address;
                        switch (assembledLine.command) {
                            case Command.subleqInstruction:
                                nextAddress += Constants.subleqInstructionBytes;
                                if (lineExpressions.length < 3) {
                                    expressions.push(nextAddress);
                                }
                                break;

                            case Command.dataDirective:
                                nextAddress += lineExpressions.length;
                                break;
                        }

                        // Update source map
                        // TODO: Consider supporting multiple values/strings in the source map and variable stuff
                        if (nextAddress !== address) {
                            sourceMap[address] = {
                                lineNumber: i,
                                command: assembledLine.command,
                                source: line
                            };

                            address = nextAddress;
                        }
                    } else {
                        throw new CompilationError("SyntaxError", `No expressions supplied for command ${Command[assembledLine.command]}`, context);
                    }
                }
            }
        }

        // Resolve all values
        const bytes = [];
        for (let i = 0; i < expressions.length; i++) {
            const expression = expressions[i];
            let expressionValue: number;
            if (Assembler.isLabelReference(expression)) {
                expressionValue = labels[expression.label];
                if (expressionValue === undefined) {
                    throw new CompilationError("ReferenceError", `Undefined reference: ${expression.label}`, expression.context);
                }

                if (expression.negated) {
                    expressionValue = Assembler.signedToUnsigned(-expressionValue);
                }

                expressionValue += expression.offset;

                if (expressionValue < 0 || expressionValue > Constants.addressMax) {
                    throw new CompilationError("AddressError", `Address \"${expression.label}${expression.offset >= 0 ? "+" : ""}${expression.offset}\" (${expressionValue}) is outside of valid range of [${Constants.addressMin}, ${Constants.addressMax}]`, expression.context);
                }
            } else {
                expressionValue = expression;
            }

            bytes.push(expressionValue);
        }

        const variables: VariableDefinition[] = [];
        for (let i = 0; i < sourceMap.length; i++) {
            if (sourceMap[i] && sourceMap[i].command === Command.dataDirective && addressToLabel[i]) {
                variables.push({
                    label: `${Syntax.referencePrefix}${addressToLabel[i]}`,
                    address: i,
                });
            }
        }

        if (address - 1 > Constants.addressUserMax) {
            throw new CompilationError("SizeError", `Program is too long (maximum size: ${Constants.addressUserMax + 1} bytes; program size: ${address} bytes)`);
        }

        return {
            bytes,
            sourceMap,
            variables,
        };
    };
}

export interface Variable {
    label: string;
    value: number;
}

export interface HaltData {
    cyclesExecuted: number;
    memoryBytesAccessed: number;
}

export interface StateUpdatedData {
    running: boolean;
    ip: number;
    target: number;
    sourceLineNumber: number;
    source: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    variables: Variable[];
}

export interface EmulatorOptions {
    readInput?: () => number;
    writeOutput?: (value: number) => void;

    onHalt?: (data: HaltData) => void;
    onWriteMemory?: (address: number, byte: number) => void;
    onStateUpdated?: (data: StateUpdatedData) => void;
}

export class Emulator {
    // State
    private running = true;
    private ip = 0;

    // Memory
    private memory: number[] = [];
    private initialMemorySnapshot: number[];

    // Metrics

    // Memory access
    private memoryAccessed: boolean[] = [];
    private memoryBytesAccessed = 0;

    // Cycle count
    private cyclesExecuted = 0;

    constructor(private program: AssembledProgram, private callbacks: EmulatorOptions = {}) {
        const bytes = this.program.bytes;
        for (let i = 0; i <= Constants.addressMax; i++) {
            const value = (i < bytes.length) ? bytes[i] : 0;
            this.memory[i] = value;

            if (this.callbacks.onWriteMemory) {
                this.callbacks.onWriteMemory(i, value);
            }
        }

        // Save initial memory to support resetting
        this.initialMemorySnapshot = this.memory.slice();

        // Emit initial state info
        this.stateUpdated();
    }

    private stateUpdated(): void {
        if (this.callbacks.onStateUpdated) {
            // Find source info in source map
            const sourceMap = this.program.sourceMap;
            const ip = this.ip;
            let sourceLineNumber = 0;
            let source = "?";
            const sourceMapEntry = sourceMap[ip];
            if (sourceMapEntry) {
                // Exact match in the source map
                sourceLineNumber = sourceMapEntry.lineNumber;
                source = sourceMapEntry.source;
            } else {
                // No match in the source map; use the previous line number
                for (let i = ip; i >= 0; i--) {
                    const previousEntry = sourceMap[i];
                    if (previousEntry) {
                        sourceLineNumber = previousEntry.lineNumber;
                        break;
                    }
                }
            }

            const variables: Variable[] = [];
            for (let i = 0; i < this.program.variables.length; i++) {
                variables.push({
                    label: this.program.variables[i].label,
                    value: Assembler.unsignedToSigned(this.memory[this.program.variables[i].address])
                });
            }

            this.callbacks.onStateUpdated({
                running: this.running,
                ip,
                target: this.memory[ip],
                sourceLineNumber,
                source,
                cyclesExecuted: this.cyclesExecuted,
                memoryBytesAccessed: this.memoryBytesAccessed,
                variables
            });
        }
    }

    private accessMemory(address: number): void {
        if (!this.memoryAccessed[address]) {
            this.memoryBytesAccessed++;
        }

        this.memoryAccessed[address] = true;
    };

    private readMemory(address: number): number {
        this.accessMemory(address);
        return this.memory[address];
    };

    private writeMemory(address: number, value: number): void {
        this.accessMemory(address);
        this.memory[address] = value;
        if (this.callbacks.onWriteMemory) {
            this.callbacks.onWriteMemory(address, value);
        }
    };

    public isEmpty(): boolean {
        for (const byte of this.memory) {
            if (byte !== 0) {
                return false;
            }
        }
        return true;
    }

    public isRunning(): boolean {
        return this.ip >= 0 && (this.ip <= Constants.addressInstructionMax);
    };

    public getCyclesExecuted(): number {
        return this.cyclesExecuted;
    }

    public getMemoryBytesAccessed(): number {
        return this.memoryBytesAccessed;
    }

    public step(): void {
        if (this.isRunning()) {
            const a = this.readMemory(this.ip++);
            const b = this.readMemory(this.ip++);
            const c = this.readMemory(this.ip++);

            // Read operands
            let input = 0;
            if (a === Constants.addressInput || b === Constants.addressInput) {
                this.accessMemory(Constants.addressInput);
                if (this.callbacks.readInput) {
                    input = this.callbacks.readInput();
                }
            }

            const av = (a === Constants.addressInput) ? input : this.readMemory(a);
            const bv = (b === Constants.addressInput) ? input : this.readMemory(b);

            // Arithmetic (wraps around on overflow)
            const result = (av - bv) & 0xff;

            // Write result
            const resultSigned = Assembler.unsignedToSigned(result);
            switch (a) {
                case Constants.addressInput:
                case Constants.addressHalt:
                    break;

                case Constants.addressOutput:
                    this.accessMemory(Constants.addressOutput);
                    if (this.callbacks.writeOutput) {
                        this.callbacks.writeOutput(resultSigned);
                    }
                    break;
    
                default:
                    this.writeMemory(a, result);
                    break;
            }

            // Branch, if necessary
            if (resultSigned <= 0) {
                this.ip = c;
            }

            this.cyclesExecuted++;
            this.running = this.isRunning();
            this.stateUpdated();

            if (this.callbacks.onHalt && !this.running) {
                this.callbacks.onHalt({
                    cyclesExecuted: this.cyclesExecuted,
                    memoryBytesAccessed: this.memoryBytesAccessed,
                });
            }
        }
    };

    public run(): void {
        while (this.running) {
            this.step();
        }
    };

    /** Resets the emulator's memory back to its initial state. */
    public reset(): void {
        // Reset state
        this.running = true;
        this.ip = 0;
        this.memoryAccessed = [];
        this.memoryBytesAccessed = 0;
        this.cyclesExecuted = 0;

        // Reset memory
        for (let i = 0; i <= Constants.addressMax; i++) {
            const value = this.initialMemorySnapshot[i];
            if (this.memory[i] !== value) {
                this.memory[i] = value;
                if (this.callbacks.onWriteMemory) {
                    this.callbacks.onWriteMemory(i, value);
                }
            }
        }

        // Broadcast the update
        this.stateUpdated();
    }
}
