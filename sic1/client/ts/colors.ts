export interface Color {
    // All on range 0 - 1
    red: number;
    green: number;
    blue: number;
    opacity?: number;
}

const colorVariables = [
    // Required
    "fg",   // Foreground
    "sbg",  // Message box background
    "bg",   // Background

    // Optional
    "sfg",  // Deemphasized text
] as const;

export type ColorVariable = typeof colorVariables[number];

const colorVariableFallbacks = {
    sfg: "sbg",
} as const;

const lime = { red: 0, green: 1, blue: 0 };
const green = { red: 0, green: 0.5, blue: 0 };
const black = { red: 0, green: 0, blue: 0 };

const white = { red: 1, green: 1, blue: 1 };
const light = { red: 0.93, green: 0.93, blue: 0.93 };
const darkGray = { red: 0.41, green: 0.41, blue: 0.41 };
const lightGray = { red: 0.75, green: 0.75, blue: 0.75 };

const brightP1 = { red: 0.25, green: 1, blue: 0 };
const darkP1 = { red: 0.13, green: 0.5, blue: 0 };
const phosphorBackground = { red: 0.05, green: 0.05, blue: 0.05 };

const brightP3 = { red: 1, green: 0.69, blue: 0 };
const darkP3 = { red: 0.4, green: 0.27, blue: 0 };

const colorSchemes = {
    "Default": {
        fg: lime,
        sbg: green,
        bg: black,
    },
    "White on Black": {
        fg: light,
        sbg: darkGray,
        bg: black,
        filter: "grayscale(1)",
    },
    "Black on White": {
        fg: black,
        sfg: darkGray,
        sbg: lightGray,
        bg: white,
        filter: "grayscale(1) invert()",
    },
    "Green Phosphor": {
        fg: brightP1,
        sbg: darkP1,
        bg: phosphorBackground,
        filter: "contrast(0.9)",
    },
    "Amber Phosphor": {
        fg: brightP3,
        sbg: darkP3,
        bg: phosphorBackground,
        filter: "sepia(1) saturate(5) contrast(0.9)", // sepia() is apparently amber!
    },
} as const;

function setCssVariable(variable: string, value: string): void {
    document.documentElement.style.setProperty(`--${variable}`, value);
}

export type ColorScheme = keyof typeof colorSchemes;
export const colorSchemeNames = Object.keys(colorSchemes);

export function isColorScheme(colorSchemeString: string): colorSchemeString is ColorScheme {
    return !!colorSchemes[colorSchemeString];
}

export function colorToCssColor(color: Color): string {
    const { red, green, blue, opacity } = color;
    return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${opacity ?? 1})`;
}

export function getColor(colorSchemeName: ColorScheme, variable: string): Color {
    const colorScheme = colorSchemes[colorSchemeName];
    return colorScheme[variable] ?? colorScheme[colorVariableFallbacks[variable]];
}

export function applyColorScheme(colorSchemeName: ColorScheme): void {
    const scheme = colorSchemes[colorSchemeName];
    if (scheme) {
        for (const variable of colorVariables) {
            const color = getColor(colorSchemeName, variable);
            if (color) {
                setCssVariable(variable, colorToCssColor(color));
            }
        }

        setCssVariable("filter", scheme["filter"] ?? "none");
    }
}
