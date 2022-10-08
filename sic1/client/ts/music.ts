const musicIds = {
    default: (new URL('../music/elevator.ogg', import.meta.url)).href,
};

export type MusicId = keyof(typeof musicIds);

export class Music {
    private static enabled: boolean = false;
    private static playing: boolean = false;
    private static audio = new Audio();
    private static currentId: MusicId | null = null;

    private static loadIfNeeded(): void {
        if (Music.enabled && Music.currentId !== null) {
            if (Music.audio.src !== musicIds[Music.currentId]) {
                Music.audio.src = musicIds[Music.currentId];
                Music.audio.loop = true;
                Music.audio.load();
            }
        }
    }

    public static select(id: MusicId): void {
        if (id !== Music.currentId) {
            const wasPlaying = Music.playing;
            
            Music.currentId = id;
            Music.playing = false;

            if (Music.enabled) {
                Music.audio.pause();
                Music.loadIfNeeded();
                if (wasPlaying) {
                    Music.start();
                }
            }
        }
    }

    public static start(): void {
        if (Music.enabled && Music.currentId !== null && !Music.playing) {
            Music.loadIfNeeded();
            Music.audio.play();
            Music.playing = true;
        }
    }

    public static stop(): void {
        if (Music.playing) {
            Music.audio.pause();
            Music.playing = false;
        }
    }

    public static setEnabled(enabled: boolean): void {
        Music.enabled = enabled;
        if (Music.enabled) {
            Music.start();
        } else {
            Music.stop();
        }
    }

    public static setVolume(volume: number): void {
        Music.audio.volume = volume;
    }
}
