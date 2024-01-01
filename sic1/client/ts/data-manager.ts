import { debug } from "./setup";
import { Shared } from "./shared";
import { Platform, PresentationData } from "./platform";
import { puzzleFlatArray } from "../../shared/puzzles";
import * as LZString from "lz-string";
import { LocalizedResources } from "./resources";

export type Inbox = { id: string, read: boolean }[];

// The "generation" user data property is used to prompt existing users to enable new features, if desired
export const UserDataGenerations = {
    original: 1,
    soundEffectsAdded: 2,
    musicAdded: 3, // Also the initial Steam release
} as const;

export const currentUserDataGeneration = UserDataGenerations.musicAdded;

// Mapping from Format to FormatName
export const formatToName = [
    "numbers",
    "characters",
    "strings",
] as const;

export const formatNameToFormat = Object.fromEntries(formatToName.map((name, format) => [name, format]));

export type FormatName = typeof formatToName[number];

// Persistent state management
export interface UserData {
    userId?: string;
    name?: string;
    introCompleted: boolean;
    solvedCount: number;
    currentPuzzle?: string;
    uploadName?: boolean;
    inbox?: Inbox;
    generation?: number;
    colorScheme?: string;

    tabInsertMode?: boolean;
    autoIndentMode?: boolean;
}

export interface PuzzleSolution {
    name: string;
    code?: string;

    customInput?: string;
    customInputFormat?: FormatName;
    customOutputFormat?: FormatName;

    solutionCycles?: number;
    solutionBytes?: number;
}

export interface PuzzleData {
    unlocked: boolean;
    viewed: boolean;
    solved: boolean;
    solutionCycles?: number;
    solutionBytes?: number;

    // New code format
    solutions: PuzzleSolution[]; 
    currentSolutionName?: string;

    // Old code format
    code?: string;
    customInput?: string;
    customInputFormat?: FormatName;
    customOutputFormat?: FormatName;
}

export interface AvoisionData {
    score?: number;
}

export class Sic1DataManager {
    private static readonly userIdLength = 15;
    private static readonly prefix = Shared.localStoragePrefix;

    private static cache = {};

    private static generateUserId() {
        const characters = "abcdefghijklmnopqrstuvwxyz";
        let id = "";
        for (var i = 0; i < Sic1DataManager.userIdLength; i++) {
            id += characters[Math.floor(Math.random() * characters.length)];
        }
        return id;
    }

    private static createDefaultData(): UserData {
        return {
            userId: undefined,
            name: undefined,
            introCompleted: false,
            solvedCount: 0,
            currentPuzzle: undefined,
            generation: currentUserDataGeneration,
        };
    }

    private static createDefaultPuzzleData(): PuzzleData {
        return {
            unlocked: false,
            viewed: false,
            solved: false,
            solutionCycles: undefined,
            solutionBytes: undefined,
            solutions: [
                { name: LocalizedResources.defaultSolutionName.getValue() },
            ],
            currentSolutionName: LocalizedResources.defaultSolutionName.getValue(),
        };
    }

    private static createDefaultPresentationData(): PresentationData {
        return {
            fullscreen: false,
            zoom: 1,

            soundEffects: false,
            soundVolume: 1,

            music: false,
            musicVolume: 1,
        };
    }

    private static createDefaultAvoisionData(): AvoisionData {
        return {};
    }

    private static loadObjectFromStorage<T>(key: string): T {
        try {
            const str = localStorage.getItem(key);
            if (str) {
                return JSON.parse(str) as T;
            }
        } catch (e) {}

        return null;
    }

    private static loadObjectWithDefault<T>(key: string, defaultDataCreator: () => T, populateAllProperties = false): T {
        let data = Sic1DataManager.cache[key] as T;
        if (!data) {
            data = Sic1DataManager.loadObjectFromStorage<T>(key) || defaultDataCreator();
            Sic1DataManager.cache[key] = data;
        }

        if (populateAllProperties) {
            const defaultData = defaultDataCreator();
            for (const dataKey of Object.keys(defaultData)) {
                if (data[dataKey] === undefined) {
                    data[dataKey] = defaultData[dataKey];
                }
            }
        }

        return data;
    }

    private static saveObject(key: string): void {
        try {
            localStorage.setItem(key, JSON.stringify(Sic1DataManager.cache[key]));
        } catch (e) {}

        if (Platform.scheduleLocalStoragePersist) {
            Platform.scheduleLocalStoragePersist();
        }
    }

    private static getPuzzleKey(title: string): string {
        return `${Sic1DataManager.prefix}Puzzle_${title}`;
    }

    private static getPresentationKey(): string {
        return `${Sic1DataManager.prefix}_presentation`;
    }

    private static getAvoisionKey(): string {
        return `${Sic1DataManager.prefix}_avoision`;
    }

    private static getKeyList(): string[] {
        return [
            // Note: getPresentationKey is skipped because sound/music volume, etc. should be device-specific
            Sic1DataManager.prefix,
            Sic1DataManager.getAvoisionKey(),
            `${Shared.localStoragePrefix}achievements`, // cf. platform.ts
            ...puzzleFlatArray.map(puzzle => Sic1DataManager.getPuzzleKey(puzzle.title)),
        ];
    }

    public static exportData(): string {
        const data: { [key: string]: any } = {};
        for (const key of Sic1DataManager.getKeyList()) {
            const value = Sic1DataManager.loadObjectFromStorage<any>(key);
            if (value) {
                data[key] = value;
            }
        }

        return LZString.compressToBase64(JSON.stringify(data));
    }

    public static clearAllDataAsync(): Promise<void> {
        try {
            // First, reset the object cache completely
            Sic1DataManager.cache = {};

            // Delete everything in localStorage
            for (const key of Sic1DataManager.getKeyList()) {
                localStorage.removeItem(key);
            }
        } catch {}
        return Promise.resolve();
    }

    public static async overwriteDataAsync(compressed: string): Promise<void> {
        const data = JSON.parse(LZString.decompressFromBase64(compressed)) as { [key: string]: any };
        if (!data) {
            throw "No data!";
        }

        await Sic1DataManager.clearAllDataAsync();

        // Save everything to localStorage
        for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, JSON.stringify(value));
        }

        // Note: Not persisting because overwriteDataAsync is web-only
    }

    public static getData(): UserData {
        const state = Sic1DataManager.loadObjectWithDefault<UserData>(Sic1DataManager.prefix, Sic1DataManager.createDefaultData);

        // Ensure user id and name are populated
        if (debug) {
            // Use a fixed user name in debug mode, to avoid polluting the production database
            state.userId = "abcdefghijklmno";
        } else {
            state.userId = (state.userId && state.userId.length === Sic1DataManager.userIdLength) ? state.userId : Sic1DataManager.generateUserId();
        }

        // Override name, if necessary
        state.name = Platform.userNameOverride || state.name;
        if (state.name && state.name.length > 0) {
            state.name = state.name.slice(0, 50);
        }

        return state;
    }

    public static saveData(): void {
        Sic1DataManager.saveObject(Sic1DataManager.prefix);
    }

    public static getPuzzleData(title: string): PuzzleData {
        const data = Sic1DataManager.loadObjectWithDefault<PuzzleData>(Sic1DataManager.getPuzzleKey(title), Sic1DataManager.createDefaultPuzzleData);

        // Migrate code save format
        if (data.solutions === undefined) {
            const { code, customInput, customInputFormat, customOutputFormat } = data;

            data.solutions = [{
                name: LocalizedResources.defaultSolutionName.getValue(),
                code,
                customInput,
                customInputFormat,
                customOutputFormat,
            }];

            data.code = undefined;
            data.customInput = undefined;
            data.customInputFormat = undefined;
            data.customOutputFormat = undefined;
        }

        return data;
    }

    public static getPuzzleDataAndSolution(title: string, solutionName: string, allowFallback: boolean): { puzzleData: PuzzleData, solution?: PuzzleSolution } {
        const puzzleData = Sic1DataManager.getPuzzleData(title);
        let solution: PuzzleSolution | undefined;
        if (!puzzleData.solutions || (puzzleData.solutions.length === 0)) {
            if (allowFallback) {
                // No solutions exist; create a default one and return that
                solution = { name: LocalizedResources.defaultSolutionName.getValue() };
                puzzleData.solutions = [solution];
            }
        } else {
            // Find the named solution
            if (solutionName) {
                solution = puzzleData.solutions.find(s => s.name === solutionName);
            }

            if (!solution && allowFallback) {
                // Couldn't find the named solution (or no name provided); just return the first one
                solution = puzzleData.solutions[0];
            }
        }

        return {
            puzzleData,
            solution,
        };
    }

    public static savePuzzleData(title: string): void {
        Sic1DataManager.saveObject(Sic1DataManager.getPuzzleKey(title));
    }

    public static getPresentationData(): PresentationData {
        if (Platform.presentationSettings) {
            return Platform.presentationSettings;
        } else {
            return Sic1DataManager.loadObjectWithDefault<PresentationData>(Sic1DataManager.getPresentationKey(), Sic1DataManager.createDefaultPresentationData, true);
        }
    }

    public static savePresentationData(): void {
        if (Platform.presentationSettings) {
            Platform.schedulePresentationSettingsPersist!();
        } else {
            Sic1DataManager.saveObject(Sic1DataManager.getPresentationKey());
        }
    }

    public static getAvoisionData(): AvoisionData {
        return Sic1DataManager.loadObjectWithDefault<AvoisionData>(Sic1DataManager.getAvoisionKey(), Sic1DataManager.createDefaultAvoisionData);
    }

    public static saveAvoisionData(): void {
        Sic1DataManager.saveObject(Sic1DataManager.getAvoisionKey());
    }
}
