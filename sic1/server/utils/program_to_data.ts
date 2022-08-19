function unsignedToSigned(unsigned: number): number {
    let signed = unsigned & 0x7f;
    signed += (unsigned & 0x80) ? -128 : 0;
    return signed;
}

function format(program: string) {
    const result: number[] = [];
    for (let i = 0; i < program.length; i += 2) {
        const hexString = program.substring(i, i + 2);
        const byte = parseInt(hexString, 16);
        result.push(unsignedToSigned(byte));
    };
    return result.join(" ");
}

const program = process.argv[2];
console.log("");
console.log(format(program));
