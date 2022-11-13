import { debug } from "./setup";
import { Sic1Root } from "./root";
import { BootScreen } from "./boot-screen";
import { Timer } from "./timer";
import { Component, ComponentChild, render } from "preact";
import { Platform, PresentationData } from "./platform";
import { Sic1DataManager } from "./data-manager";
import { SoundEffects } from "./sound-effects";
import { Music } from "./music";

type State = "booting" | "loading" | "loaded";

class Fader extends Timer {
    public render(): ComponentChild {
        return <div class="fader" style={`animation-duration: ${this.props.timerInMS}ms;`}></div>;
    }
}

interface Sic1MainState {
    state: State;

    // Presentation settings
    fullscreen: boolean;
    zoom: number;

    soundEffects: boolean;
    soundVolume: number;

    music: boolean;
    musicVolume: number;
}

class Sic1Main extends Component<{}, Sic1MainState> {
    private initialFontSizePercent: number;

    constructor(props) {
        super(props);

        const { fullscreen, zoom, soundEffects, soundVolume, music, musicVolume } = Sic1DataManager.getPresentationData();
        this.state = {
            state: (debug ? "loaded" : "booting"),
            fullscreen: Platform.fullscreenDefault ?? fullscreen,
            zoom,
            soundEffects,
            soundVolume,
            music,
            musicVolume,
        };

        const fontSize = document.documentElement.style.getPropertyValue("font-size") || "100%";
        this.initialFontSizePercent = parseFloat(/^([0-9]+)%$/.exec(fontSize)[1]);
    }

    private keyUpHandler = (event: KeyboardEvent) => {
        if (event.altKey && event.key === "Enter" || (Platform.app && (event.key === "F11" || event.key === "F4"))) {
            // Fullscreen hotkeys: Alt+Enter (on all platforms), and also F4/F11 for non-web versions
            this.updateFullscreen(!Platform.fullscreen.get());
        }
    }

    private updatePresentationSetting<T extends keyof PresentationData>(key: T, value: PresentationData[T], callback?: () => void): void {
        const presentation = Sic1DataManager.getPresentationData();
        if (presentation[key] !== value) {
            presentation[key] = value;
            Sic1DataManager.savePresentationData();
            this.setState({ [key]: presentation[key] });
            if (callback) {
                callback();
            }
        }
    }

    private updateFullscreen(enabled: boolean): void {
        this.updatePresentationSetting("fullscreen", enabled);
        Platform.fullscreen.set(enabled);
    }

    private applyZoom(zoom: number): void {
        document.documentElement.style.setProperty("font-size", `${this.initialFontSizePercent * zoom}%`);
    }

    private updateZoom(zoom: number): void {
        this.updatePresentationSetting("zoom", zoom, () => {
            this.applyZoom(zoom);
        });
    }

    private updateSoundEffects(enabled: boolean): void {
        this.updatePresentationSetting("soundEffects", enabled, () => {
            SoundEffects.setEnabled(enabled);
            SoundEffects.play("click");
        });
    }

    private updateSoundVolume(volume: number): void {
        this.updatePresentationSetting("soundVolume", volume, () => {
            SoundEffects.setVolume(volume);
            SoundEffects.play("click", volume);
        });
    }

    private updateMusic(enabled: boolean): void {
        this.updatePresentationSetting("music", enabled, () => {
            Music.setEnabled(enabled);
        });
    }

    private updateMusicVolume(volume: number): void {
        this.updatePresentationSetting("musicVolume", volume, () => {
            Music.setVolume(volume);
        });
    }

    public componentDidMount() {
        window.addEventListener("keyup", this.keyUpHandler);

        // Apply presentation settings
        const presentationData = Sic1DataManager.getPresentationData();

        // Note: Fullscreen is not applied here because:
        //
        //  1) Web version never launches directly to fullscreen
        //  2) Desktop version handles fullscreen prior to page load

        this.applyZoom(presentationData.zoom);

        SoundEffects.setEnabled(presentationData.soundEffects);
        SoundEffects.setVolume(presentationData.soundVolume);

        Music.setEnabled(presentationData.music);
        Music.setVolume(presentationData.musicVolume);
    }

    public componentWillUnmount() {
        window.removeEventListener("keyup", this.keyUpHandler);
    }

    render(): ComponentChild {
        const { state, ...presentationSettings } = this.state;
        return <>
            {state === "booting" ? <BootScreen onCompleted={() => this.setState({ state: "loading" })} /> : null}
            {state === "loading" ? <Fader timerInMS={250} onTimerCompleted={() => this.setState({ state: "loaded" })} /> : null}
            {(state === "loading" || state === "loaded")
                ? <Sic1Root
                    {...presentationSettings}
                    onFullscreenUpdated={enabled => this.updateFullscreen(enabled)}
                    onZoomUpdated={zoom => this.updateZoom(zoom)}

                    onSoundEffectsUpdated={enabled => this.updateSoundEffects(enabled)}
                    onSoundVolumeUpdated={volume => this.updateSoundVolume(volume)}

                    onMusicUpdated={enabled => this.updateMusic(enabled)}
                    onMusicVolumeUpdated={volume => this.updateMusicVolume(volume)}
                    />
                : null}
        </>;
    }
}

render(<Sic1Main />, document.getElementById("root"));
