import { TaskManager, TaskManagerJson, TaskManagerOptions } from "crs_queue";

interface LeaderboardQueueUpdate {
    id: string;
    retryCount: number;
    score: number;
    details?: number[];
}

export interface FriendLeaderboardEntry {
    name: string;
    score: number;
}

interface SteamApiJson {
    leaderboardQueue: TaskManagerJson<LeaderboardQueueUpdate>;
}

export class SteamApi {
    private static readonly leaderboardQueueRate = {
        count: 10,
        periodMS: 1000 * 60 * 10,
    };

    private static readonly leaderboardQueueRetryIntervalsMS = [
        60 * 1000,
        60 * 60 * 1000,
        24 * 60 * 60 * 1000,
        7 * 24 * 60 * 60 * 1000,
    ];

    private steam = chrome.webview.hostObjects.sync.steam;
    private leaderboardNameToHandle: { [name: string]: number } = {};
    private leaderboardQueue: TaskManager<LeaderboardQueueUpdate, void>;
    private onPersistRequested: () => void;

    constructor(onPersistRequested: () => void, serializedJson: string | null) {
        this.onPersistRequested = onPersistRequested;

        const leaderboardQueueOptions: TaskManagerOptions<LeaderboardQueueUpdate, void> = {
            rateLimit: SteamApi.leaderboardQueueRate,
            onRunTask: task => this.runLeaderboardTaskAsync(task),
            onTaskFailure: task => this.handleLeaderboardTaskFailure(task),
        };

        try {
            if (serializedJson) {
                const deserialized = JSON.parse(serializedJson) as SteamApiJson;
                this.leaderboardQueue = TaskManager.fromParsedJson<LeaderboardQueueUpdate, void>(deserialized.leaderboardQueue, leaderboardQueueOptions);
            }
        } catch {
            // Will create the task manager below on error
        }

        if (!this.leaderboardQueue) {
            this.leaderboardQueue = new TaskManager<LeaderboardQueueUpdate, void>(leaderboardQueueOptions);
        }
    }

    private async runLeaderboardTaskAsync(task: LeaderboardQueueUpdate): Promise<void> {
        const leaderboard = await this.getLeaderboardHandleAsync(task.id);
        await this.steam.SetLeaderboardEntryAsync(leaderboard, task.score, task.details);
        this.onPersistRequested();
    }

    private handleLeaderboardTaskFailure(task: LeaderboardQueueUpdate): void {
        // Retry task (with delay)
        this.leaderboardQueue.run(
            { ...task, retryCount: task.retryCount + 1},
            new Date(Date.now() + SteamApi.leaderboardQueueRetryIntervalsMS[Math.min(SteamApi.leaderboardQueueRetryIntervalsMS.length - 1, task.retryCount)]),
        );

        this.onPersistRequested();
    }

    private async getLeaderboardHandleAsync(leaderboardName: string): Promise<number> {
        let handle = this.leaderboardNameToHandle[leaderboardName];
        if (typeof(handle) !== "number") {
            handle = await this.steam.GetLeaderboardAsync(leaderboardName);
            this.leaderboardNameToHandle[leaderboardName] = handle;
        }
        return handle;
    }

    public serialize(): string {
        return JSON.stringify({
            leaderboardQueue: this.leaderboardQueue.toParsedJson(),
        });
    }

    public updateLeaderboardEntryAsync(leaderboardName: string, score: number, details?: number[]): Promise<void> | null {
        const result = this.leaderboardQueue.run({
            id: leaderboardName,
            score,
            details,
            retryCount: 0,
        });

        
        this.onPersistRequested();
        return result;
    }

    public async getFriendLeaderboardAsync(leaderboardName): Promise<FriendLeaderboardEntry[]> {
        const leaderboard = await this.getLeaderboardHandleAsync(leaderboardName);
        const flatArray = await this.steam.GetFriendLeaderboardEntriesAsync(leaderboard);
        const result: FriendLeaderboardEntry[] = [];
        for (let i = 0; i < flatArray.length; i += 2) {
            result.push({ name: (flatArray[i] as string), score: (flatArray[i + 1] as number) });
        }
        return result;
    }
}
