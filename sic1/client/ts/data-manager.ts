import { Shared } from "./shared";

// Persistent state management
export interface UserData {
    userId?: string;
    name?: string;
    introCompleted: boolean;
    solvedCount: number;
    currentPuzzle?: string;
}

export interface PuzzleData {
    unlocked: boolean;
    viewed: boolean;
    solved: boolean;
    solutionCycles?: number;
    solutionBytes?: number;
    code?: string;
}

export class Sic1DataManager {
    private static readonly userIdLength = 15;
    private static readonly prefix = "sic1_";

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
            currentPuzzle: undefined
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

    private static loadObjectWithDefault<T>(key: string, defaultDataCreator: () => T): T {
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

    public static getData(): UserData {
        const state = Sic1DataManager.loadObjectWithDefault<UserData>(Sic1DataManager.prefix, Sic1DataManager.createDefaultData);

        // Ensure user id and name are populated
        state.userId = (state.userId && state.userId.length === Sic1DataManager.userIdLength) ? state.userId : Sic1DataManager.generateUserId();
        state.name = (state.name && state.name.length > 0) ? state.name.slice(0, 50) : Shared.defaultName;

        return state;
    }

    public static saveData(): void {
        Sic1DataManager.saveObject(Sic1DataManager.prefix);
    }

    public static getPuzzleData(title: string): PuzzleData {
        return Sic1DataManager.loadObjectWithDefault<PuzzleData>(Sic1DataManager.getPuzzleKey(title), Sic1DataManager.createDefaultPuzzleData);
    }

    public static savePuzzleData(title: string): void {
        Sic1DataManager.saveObject(Sic1DataManager.getPuzzleKey(title));
    }
}
