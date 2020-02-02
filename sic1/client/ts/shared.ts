export const Shared = {
    defaultName: "Bill",

    hexifyByte: (v: number): string => {
        var str = v.toString(16);
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    },

    shuffleInPlace<T>(array: T[]): void {
        for (let i = array.length - 1; i >= 1; i--) {
            const index = Math.floor(Math.random() * (i + 1));
            const tmp = array[i];
            array[i] = array[index];
            array[index] = tmp;
        }
    },
};

export interface TestSet {
    inputBytes: number[];
    expectedOutputBytes: number[];
}
