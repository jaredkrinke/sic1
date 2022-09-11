export const Shared = {
    defaultName: "Bill",
    localStoragePrefix: "sic1_",

    hexifyByte: (v: number): string => {
        var str = v.toString(16);
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    },
};
