// Valid tokens
export const Syntax = {
    subleqInstruction: "subleq",
    dataDirective: ".data",
    referencePrefix: "@",
    commentDelimiter: ";",
    optionalArgumentSeparator: ",",
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
    "AddressLiteralRangeError",
    "AddressReferenceRangeError",
    "InternalCompilerError",
    "InvalidAddressExpressionError",
    "InvalidBreakpointError",
    "InvalidCommandError",
    "InvalidDataArgumentCountError",
    "InvalidEscapeCodeError",
    "InvalidSubleqArgumentCountError",
    "InvalidTokenError",
    "InvalidValueExpressionError",
    "LabelAlreadyDefinedError",
    "MissingCommaOrWhitespaceError",
    "MissingWhitespaceError",
    "ProgramTooLargeError",
    "UndefinedReferenceError",
    "ValueRangeError",
] as const;

export type CompilationErrorType = typeof CompilationErrorTypes[number];

// Custom error type
export interface CompilationContext {
    sourceLineNumber?: number;
    sourceLine?: string;
    
    // Error-specific fields
    text?: string;
    number?: number;
    rangeMin?: number;
    rangeMax?: number;
}

export class CompilationError extends Error {
    constructor(public errorType: CompilationErrorType, message: string, public context: CompilationContext) {
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

export interface LabelDefinition {
    label: string;
    offset: number;
    inline?: boolean;
}

export interface ParsedLine {
    labelDefinitions: LabelDefinition[];
    command?: Command;
    expressions: Expression[];
    breakpoint?: boolean;
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
    breakpoints: number[];
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
    exclamationMark,
    whiteSpace,

    // Ignored
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
    private static readonly whitespaceCharacters = "\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

    // List of reserved characters that *may not* be used in identifiers (because they have, or may eventually have,
    // another meaning).
    //
    // Note: "-" must be last, and this should only be used at the end of a character class. Rough explanation of the
    // contents: breakpoint symbol, label symbol, escape symbol, parentheses (not used, but maybe could be someday),
    // comment symbol, label definition symbol, character and string markers, (optional) argument separator, and
    // offset indicators
    private static readonly reservedCharacters = `!@\\\\();:'",+-`;

    private static readonly identifierPattern = `[^${Tokenizer.whitespaceCharacters}${Tokenizer.reservedCharacters}]+`;
    private static readonly numberWithoutSignPattern = "[0-9]+";
    private static readonly printableCharacterPattern = "[ -~]";
    private static readonly printableCharactersExceptApostropheAndBackslashPattern = "[ -&(-[\\]-~]";
    private static readonly printableCharactersExceptQuoteAndBackslashPattern = "[ !#-[\\]-~]";
    private static readonly referencePattern = `${Syntax.referencePrefix}(${Tokenizer.identifierPattern})`;

    private static readonly ruleDefinitions: TokenizerRuleDefinition[] = [
        { tokenType: TokenType.whiteSpace, pattern: "\\s+" },
        { tokenType: TokenType.comma, pattern: Syntax.optionalArgumentSeparator },
        { tokenType: TokenType.exclamationMark, pattern: "!" },
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
                const errorContext: CompilationContext = {
                    ...context,
                    text: line,
                };

                throw new CompilationError("InvalidTokenError", `Invalid token: "${errorContext.text}"`, errorContext);
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
            const errorContext: CompilationContext = {
                ...context,
                text: str,
                rangeMin: Constants.addressMin,
                rangeMax: Constants.addressMax,
            }

            throw new CompilationError("AddressLiteralRangeError", `Invalid argument: "${errorContext.text}" (must be an integer on the range [${errorContext.rangeMin}, ${errorContext.rangeMax}])`, errorContext);
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
                {
                    const errorContext: CompilationContext = {
                        ...context,
                        text: `\\${escapeCharacter}`,
                    }

                    throw new CompilationError("InvalidEscapeCodeError", `Invalid escape code: "${errorContext.text}"`, errorContext);
                }
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

        const errorContext: CompilationContext = {
            ...context,
            text: token.raw,
        };

        throw new CompilationError("InternalCompilerError", `Internal compiler error on token: "${errorContext.text}"`, errorContext);
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
                {
                    const errorContext: CompilationContext = {
                        ...context,
                        text: token.raw,
                    }

                    throw new CompilationError("InvalidValueExpressionError", `Expected number, character, string, or reference, but got: "${errorContext.text}"`, errorContext);
                }
        }
    }

    private static parseAddressExpression(token: Token, context: CompilationContext): Expression {
        switch (token.tokenType) {
            case TokenType.numberLiteral:
                return Assembler.parseAddress(token.raw, context);

            case TokenType.reference:
                return Assembler.parseReference(token, context);

            default:
                {
                    const errorContext: CompilationContext = {
                        ...context,
                        text: token.raw,
                    }

                    throw new CompilationError("InvalidAddressExpressionError", `Expected number literal or reference, but got: "${errorContext.text}"`, errorContext);
                }
        }
    }

    private static parseLineInternal(tokens: Token[], context: CompilationContext): ParsedLine {
        const labelDefinitions: LabelDefinition[] = [];
        const expressions: Expression[] = [];
        let index = 0;
        let offset = 0;
        
        function skipWhiteSpace() {
            while ((index < tokens.length) && (tokens[index].tokenType === TokenType.whiteSpace)) {
                index++;
            }
        }

        function addLabelDefinitions(base?: Partial<LabelDefinition>) {
            while (index < tokens.length) {
                const tokenType = tokens[index].tokenType;
                if (tokenType === TokenType.label) {
                    const token = tokens[index];
                    labelDefinitions.push({
                        label: token.groups!["name"],
                        offset,
                        ...base,
                    });
    
                    index++;
                } else if (tokenType === TokenType.whiteSpace) {
                    index++;
                } else {
                    break;
                }
            }
        }

        // Check for persistent breakpoint indicator at the beginning of the line
        skipWhiteSpace();
        let breakpoint: boolean | undefined;
        if (index < tokens.length && tokens[index].tokenType === TokenType.exclamationMark) {
            breakpoint = true;
            index++;
        }

        // Check for label(s)
        addLabelDefinitions();

        // Check for command
        skipWhiteSpace();
        let command: Command | undefined;
        if (index < tokens.length) {
            const commandName = tokens[index++].raw;
            command = Assembler.CommandStringToCommand[commandName];
            if (command === undefined) {
                const errorContext: CompilationContext = {
                    ...context,
                    text: commandName,
                };

                throw new CompilationError("InvalidCommandError", `Unknown command: "${errorContext.text}" (valid commands are: "subleq" and ".data")`, errorContext);
            }
    
            // Add arguments
            let argumentCount = 0;
            while (index < tokens.length) {
                // Check for required whitespace/comma
                if (expressions.length === 0) {
                    // Whitespace required after command
                    if (tokens[index].tokenType !== TokenType.whiteSpace) {
                        const errorContext: CompilationContext = {
                            ...context,
                            text: commandName,
                        };

                        throw new CompilationError("MissingWhitespaceError", `Whitespace is required after "${errorContext.text}"`, errorContext);
                    }
                } else {
                    // Whitespace or comma required between arguments
                    if (index < tokens.length) {
                        const tokenType = tokens[index].tokenType;
                        if (tokenType !== TokenType.comma && tokenType !== TokenType.whiteSpace) {
                            const errorContext: CompilationContext = {
                                ...context,
                                text: tokens[index].raw,
                            };
    
                            throw new CompilationError("MissingCommaOrWhitespaceError", `Whitespace or comma required before argument: "${errorContext.text}"`, errorContext);
                        }
                    }
    
                    skipWhiteSpace();
                    if (index < tokens.length && tokens[index].tokenType === TokenType.comma) {
                        index++;
                    }
                }
    
                // Add any inline labels
                addLabelDefinitions({ inline: true });
    
                // Parse the argument
                if (index < tokens.length) {
                    switch (command) {
                        case Command.subleqInstruction:
                            expressions.push(Assembler.parseAddressExpression(tokens[index], context));
                            offset++;
                            break;
    
                        case Command.dataDirective:
                            const parsedValueExpression = Assembler.parseValueExpression(tokens[index], context);
                            if (Array.isArray(parsedValueExpression)) {
                                expressions.push(...parsedValueExpression);
                                offset += parsedValueExpression.length;
                            } else {
                                expressions.push(parsedValueExpression);
                                offset++;
                            }
                            break;
                    }

                    argumentCount++;
                    index++;
                }
            }

            // Check argument count
            switch (command) {
                case Command.subleqInstruction:
                    if (argumentCount < 2 || argumentCount > 3) {
                        const errorContext: CompilationContext = {
                            ...context,
                            number: argumentCount,
                            rangeMin: 2,
                            rangeMax: 3,
                        };

                        throw new CompilationError("InvalidSubleqArgumentCountError", `Invalid number of arguments for "subleq": ${errorContext.number} (must be between ${errorContext.rangeMin} and ${errorContext.rangeMax}, inclusive)`, errorContext);
                    }
                    break;

                case Command.dataDirective:
                    if (argumentCount <= 0) {
                        const errorContext: CompilationContext = {
                            ...context,
                            number: argumentCount,
                            rangeMin: 1,
                        };

                        throw new CompilationError("InvalidDataArgumentCountError", `Invalid number of arguments for ".data": ${errorContext.number} (must have at least 1 argument)`, errorContext);
                    }
                    break;
            }
        }

        if (breakpoint && command !== Command.subleqInstruction) {
            throw new CompilationError("InvalidBreakpointError", "Breakpoints are only supported on subleq instructions", context);
        }

        return {
            labelDefinitions,
            command,
            expressions,
            breakpoint,
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
            const errorContext: CompilationContext = {
                ...context,
                text: str,
                rangeMin: Constants.valueMin,
                rangeMax: Constants.valueMax,
            };

            throw new CompilationError("ValueRangeError", `Invalid argument: ${errorContext.text} (must be an integer on the range [${errorContext.rangeMin}, ${errorContext.rangeMax}])`, errorContext);
        }
    }

    public static parseCharacter(token: Token, context?: CompilationContext): number {
        if (!token.groups) {
            const errorContext: CompilationContext = {
                ...context,
                text: token.raw,
            };
    
            throw new CompilationError("InternalCompilerError", `Internal compiler error on token: "${errorContext.text}"`, errorContext);
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
            const errorContext: CompilationContext = {
                ...context,
                text: token.raw,
            };
    
            throw new CompilationError("InternalCompilerError", `Internal compiler error on token: "${errorContext.text}"`, errorContext);
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
        const variables: VariableDefinition[] = [];
        let address = 0;
        let labels: {[name: string]: number} = {};

        labels[`MAX`] = Constants.addressUserMax;
        labels[`IN`] = Constants.addressInput;
        labels[`OUT`] = Constants.addressOutput;
        labels[`HALT`] = Constants.addressHalt;

        const breakpoints: number[] = [];

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

                // Add breakpoint, if desired
                if (assembledLine.breakpoint) {
                    breakpoints.push(address);
                }

                // Add labels, if present
                for (const { label, offset, inline } of assembledLine.labelDefinitions) {
                    if (labels[label] !== undefined) {
                        const errorContext: CompilationContext = {
                            ...context,
                            text: `${Syntax.referencePrefix}${label}`,
                        };

                        throw new CompilationError("LabelAlreadyDefinedError", `Label already defined: "${errorContext.text}"`, errorContext);
                    }

                    const labelAddress = address + offset;
                    labels[label] = labelAddress;

                    // Variables are labels defined on a ".data" directive or as *any* inline label
                    if (inline || assembledLine.command === Command.dataDirective) {
                        variables.push({
                            label: `${Syntax.referencePrefix}${label}`,
                            address: labelAddress,
                        });
                    }
                }

                // Fill in optional addresses
                const lineExpressions = assembledLine.expressions;
                if (assembledLine.command !== undefined) {
                    if (lineExpressions.length > 0) {
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
                                source: line,
                            };

                            address = nextAddress;
                        }
                    } else {
                        // Should not be possible
                        const errorContext: CompilationContext = {
                            ...context,
                            text: "(unknown)",
                        };
                
                        throw new CompilationError("InternalCompilerError", `Internal compiler error on token: "${errorContext.text}"`, errorContext);
                    }
                }
            }
        }

        if (address - 1 > Constants.addressUserMax) {
            const errorContext: CompilationContext = {
                number: address,
                rangeMax: Constants.addressUserMax + 1,
            };

            throw new CompilationError("ProgramTooLargeError", `Program is too long (maximum size: ${errorContext.rangeMax} bytes; program size: ${errorContext.number} bytes)`, errorContext);
        }

        // Resolve all values
        const bytes = [];
        for (let i = 0; i < expressions.length; i++) {
            const expression = expressions[i];
            let expressionValue: number;
            if (Assembler.isLabelReference(expression)) {
                expressionValue = labels[expression.label];
                if (expressionValue === undefined) {
                    const errorContext: CompilationContext = {
                        ...(expression.context),
                        text: `${Syntax.referencePrefix}${expression.label}`,
                    };

                    throw new CompilationError("UndefinedReferenceError", `Undefined reference: "${errorContext.text}"`, errorContext);
                }

                if (expression.negated) {
                    expressionValue = Assembler.signedToUnsigned(-expressionValue);
                }

                expressionValue += expression.offset;

                if (expressionValue < 0 || expressionValue > Constants.addressMax) {
                    const errorContext: CompilationContext = {
                        ...(expression.context),
                        text: `${Syntax.referencePrefix}${expression.label}${expression.offset >= 0 ? "+" : ""}${expression.offset}`,
                        number: expressionValue,
                        rangeMin: Constants.addressMin,
                        rangeMax: Constants.addressMax,
                    }
                    throw new CompilationError("AddressReferenceRangeError", `Address "${errorContext.text}" (${errorContext.number}) is outside of valid range of [${errorContext.rangeMin}, ${errorContext.rangeMax}]`, errorContext);
                }
            } else {
                expressionValue = expression;
            }

            bytes.push(expressionValue);
        }

        return {
            bytes,
            sourceMap,
            variables,
            breakpoints,
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
