import { Shared } from "./shared";

const songInfo = {
    default: (new URL('../music/menu.ogg', import.meta.url)).href,
    avoision: (new URL('../music/avoision.ogg', import.meta.url)).href,
    elevator: (new URL('../music/elevator.ogg', import.meta.url)).href,
    major: (new URL('../music/major.ogg', import.meta.url)).href,
} as const;

export type SongId = keyof(typeof songInfo);

export class Music {
    private static enabled = false;
    private static volume = 1;
    private static songId: SongId = "default";
    private static current?: HTMLAudioElement = undefined;
    private static songs: { [id: string]: HTMLAudioElement } = {};

    private static getSong(id: SongId): HTMLAudioElement {
        let song = Music.songs[id];
        if (!song) {
            song = new Audio(songInfo[id]);
            song.loop = true;
            song.load();
            Music.songs[id] = song;
        }
        return song;
    }

    public static play(id?: SongId): void {
        const songId = id ?? "default";
        if (songId !== Music.songId) {
            Music.songId = songId;
            Music.pause();
        }

        if (Music.enabled && (Music.current === undefined || Music.current.paused)) {
            const song = Music.getSong(songId);
            song.volume = Music.volume;
            song.currentTime = 0;
            Music.current = song;
            Shared.ignoreRejection(song.play());
        }
    }

    public static pause(): void {
        if (Music.current) {
            Music.current.pause();
            Music.current = undefined;
        }
    }

    public static setEnabled(enabled: boolean): void {
        Music.enabled = enabled;
        if (enabled) {
            Music.play(Music.songId);
        } else {
            Music.pause();
        }
    }

    public static setVolume(volume: number): void {
        Music.volume = volume;
        if (Music.current) {
            Music.current.volume = Music.volume;
        }
    }
}
