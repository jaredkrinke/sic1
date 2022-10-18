import { debug } from "./setup";
import { Shared } from "./shared";
import { Platform, PresentationData } from "./platform";

export type Inbox = { id: string, read: boolean }[];

// The "generation" user data property is used to prompt existing users to enable new features, if desired
export const UserDataGenerations = {
    original: 1,
    soundEffectsAdded: 2,
} as const;

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
}

export interface PuzzleData {
    unlocked: boolean;
    viewed: boolean;
    solved: boolean;
    solutionCycles?: number;
    solutionBytes?: number;
    code?: string;
}

class CoalescedFunction {
    private scheduled = false;
    constructor(private readonly f: () => void | undefined, private readonly delay: number) {
    }

    public schedule(): void {
        if (this.f && !this.scheduled) {
            this.scheduled = true;
            setTimeout(() => {
                this.scheduled = false;
                this.f();
            }, this.delay);
        }
    }
}

export class Sic1DataManager {
    private static readonly userIdLength = 15;
    private static readonly prefix = Shared.localStoragePrefix;
    private static readonly persistDelayMS = 100;

    // Note: These are no-ops for web mode, but actually write out files for app mode
    private static readonly scheduleLocalStoragePersist = new CoalescedFunction(Platform.persistLocalStorage, Sic1DataManager.persistDelayMS);
    private static readonly schedulePresentationSettingsPersist = new CoalescedFunction(Platform.persistPresentationSettings, Sic1DataManager.persistDelayMS);

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
            generation: UserDataGenerations.soundEffectsAdded,
        };
    }

    private static createDefaultPuzzleData(): PuzzleData {
        return {
            unlocked: false,
            viewed: false,
            solved: false,
            solutionCycles: undefined,
            solutionBytes: undefined,

            code: null
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

    private static loadObjectWithDefault<T>(key: string, defaultDataCreator: () => T, populateAllProperties = false): T {
        let data = Sic1DataManager.cache[key] as T;
        if (!data) {
            try {
                const str = localStorage.getItem(key);
                if (str) {
                    data = JSON.parse(str) as T;
                }
            } catch (e) {}

            data = data || defaultDataCreator();
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
    }

    private static getPuzzleKey(title: string): string {
        return `${Sic1DataManager.prefix}Puzzle_${title}`;
    }

    private static getPresentationKey(): string {
        return `${Sic1DataManager.prefix}_presentation`;
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
        state.name = (state.name && state.name.length > 0) ? state.name.slice(0, 50) : Shared.defaultName;

        return state;
    }

    public static saveData(): void {
        Sic1DataManager.saveObject(Sic1DataManager.prefix);
        Sic1DataManager.scheduleLocalStoragePersist.schedule();
    }

    public static getPuzzleData(title: string): PuzzleData {
        return Sic1DataManager.loadObjectWithDefault<PuzzleData>(Sic1DataManager.getPuzzleKey(title), Sic1DataManager.createDefaultPuzzleData);
    }

    public static savePuzzleData(title: string): void {
        Sic1DataManager.saveObject(Sic1DataManager.getPuzzleKey(title));
        Sic1DataManager.scheduleLocalStoragePersist.schedule();
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
            Sic1DataManager.schedulePresentationSettingsPersist.schedule();
        } else {
            Sic1DataManager.saveObject(Sic1DataManager.getPresentationKey());
        }
    }
}
