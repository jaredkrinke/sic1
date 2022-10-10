import { Shared } from "./shared";

const soundEffectInfo = {
    click:      (new URL("../sfx/click.wav", import.meta.url)).href,
    completed:  (new URL("../sfx/completed.wav", import.meta.url)).href,
    correct:    (new URL("../sfx/correct.wav", import.meta.url)).href,
    incorrect:  (new URL("../sfx/incorrect.wav", import.meta.url)).href,
} as const;

export type SoundEffectId = keyof typeof soundEffectInfo;

export class SoundEffects {
    private static enabled: boolean = false;
    private static volume: number = 1;
    private static loaded: boolean = false;

    private static soundEffects: { [name: string]: HTMLAudioElement } | undefined = undefined;

    public static setEnabled(enabled: boolean): void {
        SoundEffects.enabled = enabled;
        if (enabled && !SoundEffects.loaded) {
            SoundEffects.loaded = true;
            SoundEffects.soundEffects = {};
            for (const [key, href] of Object.entries(soundEffectInfo)) {
                SoundEffects.soundEffects[key] = new Audio(href);
            }
        }
    }

    public static setVolume(volume: number): void {
        SoundEffects.volume = volume;
    }

    public static play(name: SoundEffectId, volumeOverride?: number): void {
        if (SoundEffects.enabled) {
            const sound = SoundEffects.soundEffects[name];
            sound.volume = volumeOverride ?? SoundEffects.volume;
            sound.currentTime = 0;
            Shared.ignoreRejection(sound.play());
        }
    }

    public static stop(name: SoundEffectId): void {
        if (SoundEffects.enabled) {
            const sound = SoundEffects.soundEffects[name];
            sound.volume = 0;
        }
    }
}
