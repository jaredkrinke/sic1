import { debug } from "./setup";
import { InitialPage, Sic1Root } from "./root";
import { BootScreen } from "./boot-screen";
import { Timer } from "./timer";
import React from "react";
import ReactDOMClient from "react-dom/client";
import { Platform, PresentationData } from "./platform";
import { Sic1DataManager, UserData } from "./data-manager";
import { SoundEffects } from "./sound-effects";
import { Music } from "./music";
import { applyColorScheme, ColorScheme, isColorScheme } from "./colors";
import { IntlConfig, IntlProvider, IntlShape, injectIntl } from "react-intl";
import { initializeResources } from "./resources";
import { Shared } from "./shared";
import { loadMessagesAsync } from "./languages";
import { localeToHrefOrMessages } from "./language-data";

type State = "booting" | "loading" | "loaded";

class Fader extends Timer {
    public render(): React.ReactNode {
        return <div className="fader" style={{ "animationDuration": `${this.props.timerInMS}ms` }}></div>;
    }
}

interface Sic1MainProps {
    intl: IntlShape;
    locale: string | undefined;
    defaultLocale: string;
    initialState: State;
    initialPage: InitialPage;
    onLanguageUpdated: (locale: string | undefined) => void;
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

    constructor(props: Sic1MainProps) {
        super(props);

        // First, localize resources because one in particular is used in Sic1DataManager.getData() (the default solution name)
        initializeResources(this.props.intl);

        const { colorScheme } = Sic1DataManager.getData();
        const colorSchemeIsValid = isColorScheme(colorScheme);

        const { fullscreen, zoom, soundEffects, soundVolume, music, musicVolume } = Sic1DataManager.getPresentationData();
        this.state = {
            state: props.initialState,
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
            // Full-screen hotkeys: Alt+Enter (on all platforms), and also F4/F11 for non-web versions
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

        // Note: Full-screen is not applied here because:
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
                    {...this.props}
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

// Main
const Sic1Main = injectIntl(Sic1MainBase);

// IntlProvider wrapper
interface Sic1ActualRootProps {
    defaultLocale: string;
    initialLocale: string;
    initialMessages: IntlConfig["messages"];
}

interface Sic1ActualRootState {
    locale: string | undefined; // Note: this one is actually a (synced) user setting
    messages: IntlConfig["messages"];
    localeUpdated?: boolean; // Minor hack to launch back into Presentation Settings on language change
}

const defaultLocale = Platform.getDefaultLocale();

async function loadMessagesForLocaleSpecifierAsync(localeSpecifier: string | undefined): Promise<IntlConfig["messages"]> {
    return await loadMessagesAsync(localeSpecifier ?? defaultLocale);
}

class Sic1ActualRoot extends React.Component<Sic1ActualRootProps, Sic1ActualRootState> {
    constructor(props: Sic1ActualRootProps) {
        super(props);

        this.state = {
            locale: props.initialLocale,
            messages: props.initialMessages,
        };
    }

    private getLocale(): string {
        return this.state.locale ?? this.props.defaultLocale;
    }

    private setLanguage(): void {
        // This is needed to ensure that reasonable fonts are used for Unicode code points that are shared across
        // multiple languages but which need to be drawn differently
        document.body.setAttribute("lang", this.getLocale());
    }

    public componentDidMount(): void {
        this.setLanguage();
    }

    public componentDidUpdate(prevProps: Readonly<Sic1ActualRootProps>, prevState: Readonly<Sic1ActualRootState>, snapshot?: any): void {
        if (this.state.locale !== prevState.locale) {
            this.setLanguage();
        }
    }

    public render(): React.ReactNode {
        const { defaultLocale } = this.props;
        const locale = this.getLocale();

        return <IntlProvider
            locale={locale}
            messages={this.state.messages}
            {...Shared.intlProviderOptions}
            >
                <Sic1Main
                    key={locale}
                    locale={locale}
                    defaultLocale={defaultLocale}
                    initialState={(debug || this.state.localeUpdated) ? "loaded" : "booting"}
                    initialPage={this.state.localeUpdated ? "presentationSettings" : "puzzleList"}
                    onLanguageUpdated={async (locale) => {
                        Sic1DataManager.getData().locale = locale;
                        Sic1DataManager.saveData();

                        // Asynchronously load messages
                        const messages = await loadMessagesForLocaleSpecifierAsync(locale);

                        this.setState({
                            locale,
                            messages,
                            localeUpdated: true,
                        });
                    }}
                />
            </IntlProvider>;
    }
}

const root = ReactDOMClient.createRoot(document.getElementById("root"));
const { locale } = Sic1DataManager.getData();

(async () => {
    let messages: IntlConfig["messages"];
    try {
        messages = await loadMessagesForLocaleSpecifierAsync(locale);
    } catch {
        // Failed to load locale-specific resources; default to (preloaded) English
        messages = localeToHrefOrMessages.en;
    }

    root.render(
        <Sic1ActualRoot
            defaultLocale={defaultLocale}
            initialLocale={locale}
            initialMessages={messages}
            />
    );
})();
