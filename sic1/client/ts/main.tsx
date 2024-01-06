import { debug } from "./setup";
import { Sic1Root } from "./root";
import { BootScreen } from "./boot-screen";
import { Timer } from "./timer";
import React from "react";
import ReactDOM from "react-dom";
import { Platform, PresentationData } from "./platform";
import { Sic1DataManager, UserData } from "./data-manager";
import { SoundEffects } from "./sound-effects";
import { Music } from "./music";
import { applyColorScheme, ColorScheme, isColorScheme } from "./colors";
import { IntlProvider, IntlShape, injectIntl } from "react-intl";
import translations from "./translations";
import { initializeResources } from "./resources";

type State = "booting" | "loading" | "loaded";

class Fader extends Timer {
    public render(): React.ReactNode {
        return <div className="fader" style={{ "animationDuration": `${this.props.timerInMS}ms` }}></div>;
    }
}

interface Sic1MainProps {
    intl: IntlShape;
}

interface Sic1MainState {
    state: State;

    // Presentation settings
    fullscreen: boolean;
    zoom: number;
    colorScheme: ColorScheme; // Note: this one is actually a (synced) user setting

    soundEffects: boolean;
    soundVolume: number;

    music: boolean;
    musicVolume: number;
}

class Sic1MainBase extends React.Component<Sic1MainProps, Sic1MainState> {
    private initialFontSizePercent: number;

    constructor(props) {
        super(props);

        // First, localize resources because one in particular is used in Sic1DataManager.getData() (the default solution name)
        initializeResources(this.props.intl);

        const { colorScheme } = Sic1DataManager.getData();
        const colorSchemeIsValid = isColorScheme(colorScheme);

        const { fullscreen, zoom, soundEffects, soundVolume, music, musicVolume } = Sic1DataManager.getPresentationData();
        this.state = {
            state: (debug ? "loaded" : "booting"),
            fullscreen: Platform.fullscreenDefault ?? fullscreen,
            zoom,
            colorScheme: colorSchemeIsValid ? colorScheme : "Default",
            soundEffects,
            soundVolume,
            music,
            musicVolume,
        };

        const fontSize = document.documentElement.style.getPropertyValue("font-size") || "100%";
        this.initialFontSizePercent = parseFloat(/^([0-9]+)%$/.exec(fontSize)[1]);

        if (colorScheme && colorSchemeIsValid) {
            applyColorScheme(colorScheme);
        }
    }

    private keyDownHandler = (event: KeyboardEvent) => {
        if (event.altKey && event.key === "Enter" || (Platform.app && (event.key === "F11" || event.key === "F4"))) {
            // Fullscreen hotkeys: Alt+Enter (on all platforms), and also F4/F11 for non-web versions
            this.updateFullscreen(!Platform.fullscreen.get());
        }
    }

    private updateSetting<TSettingsContainer, TKey extends keyof (TSettingsContainer | Sic1MainState)>(
        getSettings: () => TSettingsContainer,
        saveSettings: () => void,
        key: TKey,
        value: TSettingsContainer[TKey],
        callback?: () => void,
    ): void {
        const settings = getSettings();
        if (settings[key] !== value) {
            settings[key] = value;
            saveSettings();
            // @ts-ignore 2345 TODO: Figure out how to convince TypeScript that [key] is correct
            this.setState({ [key]: settings[key] });
            if (callback) {
                callback();
            }
        }
    }

    private updatePresentationSetting<T extends keyof PresentationData>(key: T, value: PresentationData[T], callback?: () => void): void {
        this.updateSetting(() => Sic1DataManager.getPresentationData(), () => Sic1DataManager.savePresentationData(), key, value, callback);
    }

    private updateUserSetting<T extends keyof (Sic1MainState | UserData)>(key: T, value: UserData[T], callback?: () => void): void {
        this.updateSetting(() => Sic1DataManager.getData(), () => Sic1DataManager.saveData(), key, value, callback);
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

    private updateColorScheme(colorScheme: ColorScheme): void {
        this.updateUserSetting("colorScheme", colorScheme, () => {
            applyColorScheme(colorScheme);
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
        window.addEventListener("keydown", this.keyDownHandler);

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
        window.removeEventListener("keydown", this.keyDownHandler);
    }

    render(): React.ReactNode {
        const { state, ...presentationSettings } = this.state;
        return <>
            {state === "booting" ? <BootScreen intl={this.props.intl} onCompleted={() => this.setState({ state: "loading" })} /> : null}
            {state === "loading" ? <Fader timerInMS={250} onTimerCompleted={() => this.setState({ state: "loaded" })} /> : null}
            {(state === "loading" || state === "loaded")
                ? <Sic1Root
                    {...presentationSettings}
                    intl={this.props.intl}
                    onFullscreenUpdated={enabled => this.updateFullscreen(enabled)}
                    onZoomUpdated={zoom => this.updateZoom(zoom)}
                    onColorSchemeUpdated={colorScheme => this.updateColorScheme(colorScheme)}

                    onSoundEffectsUpdated={enabled => this.updateSoundEffects(enabled)}
                    onSoundVolumeUpdated={volume => this.updateSoundVolume(volume)}

                    onMusicUpdated={enabled => this.updateMusic(enabled)}
                    onMusicVolumeUpdated={volume => this.updateMusicVolume(volume)}

                    onRestart={() => this.setState({ state: "booting" })}
                    />
                : null}
        </>;
    }
}

// Formatting
class Capitalized extends React.Component<{ children?: React.ReactNode }> {
    public render(): React.ReactNode {
        return <span className="caps">{this.props.children}</span>;
    }
}

// Main
const Sic1Main = injectIntl(Sic1MainBase);
const locale = "en"; // TODO: Set automatically

ReactDOM.render(<IntlProvider
    locale={locale}
    defaultLocale="en"
    messages={translations[locale]}
    defaultRichTextElements={{
        h3: c => <h3>{c}</h3>,
        p: c => <p>{c}</p>,
        strong: c => <strong>{c}</strong>,
        code: c => <code>{c}</code>,
        cap: c => <Capitalized>{c}</Capitalized>,
        ul: c => <ul>{c}</ul>,
        li: c => <li>{c}</li>,
    }}>
        <Sic1Main />
    </IntlProvider>,
    document.getElementById("root"));
