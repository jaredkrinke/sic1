# Help translate SIC-1 into additional languages
Now that SIC-1 is open source, **you** can help by translating SIC-1 into additional languages.

Note that this is my first attempt at localizing a browser (and Steam)-based game, so feel free to suggest improvements to the process/workflow by opening an issue.

## Overview
The (work in progress) process for translating into another language is roughly:

1. Open an issue or comment [on Discord](https://discord.com/channels/1043303969331621918/1195177608116191353) with either a) requests for translations or b) an offer to help translate into a specific language
1. Once available, use the [SIC-1 project on CrowdIn](https://crowdin.com/project/sic-1) (or GitHub directly, if desired) to translate strings (see [Local Testing Workflow](#local-testing-workflow) for how to test translations)
1. Translations will be manually gathered and added into the SIC-1 "preview" branch (a.k.a. "beta") on Steam and [SIC-1 Preview Branch on itch.io](https://jaredkrinke.itch.io/sic-1-preview)
1. Once translations have been tested for a language, the strings will be merged into the SIC-1 repository and released on Steam and itch.io, with translators credited (see [Translator Obligations](#translator-obligations))

## Translator obligations
In order to participate, there are two requirements:

1. Agree to license your translations under the [Creative Commons Attribution-ShareAlike 4.0 International](CC-BY-SA-4.0.txt), as well as following CrowdIn's policies and licensing requirements, if using CrowdIn
1. Provide a name or alias for display in the SIC-1 in-game credits window

## Local testing workflow
Note that this is a work in progress and suggestions for improvement are welcome.

SIC-1 is a browser-based game that loads translations dynamically from [react-intl](https://formatjs.io/docs/react-intl/) JSON files stored alongside the game. For reference, here's a link to [react-intl documentation around its ICU Message format syntax](https://formatjs.io/docs/core-concepts/icu-syntax).

Currently, the local testing workflow is only documented for Steam:

1. Download translation file from CrowdIn
2. Optionally make a backup of the file in the next instruction
3. Overwrite "steamapps\common\SIC-1\assets\ru-RU.json" (or zh-CN, etc.) with newly downloaded JSON file
4. Restart the game or switch to a different language using in-game menu (under Presentation Settings) and then switch back to trigger a reload of the JSON file
5. Once done, restore your backup of the file or "Verify integrity of game files" in Steam afterwards to get back to the original file (note that verifying integrity will cause the WebView2 installer to run again on next launch, which is unfortunately very slow)

Theoretically, you could use F12 DevTools in a browser (or Fiddler) for a similar workflow in the browser, but overwriting a file on disk seems easiest (but Steam-only, obviously).

## Details and notes
Here are some notes about the idiosyncrasies of localized strings in SIC-1 (and react-intl, generally):

* Annoyingly, react-intl's **ICU Message format uses ASCII apostrophe (`'`) as an escape character**, so you'll generally need to type `''` to get a single apostrophe (but note that `'` used in English contractions works fine, so `don't` would work--sadly, I don't see this documented anywhere)
* **The "languageName" string is a special case**--it is read at build-time instead of run-time to populate a list of languages using their native name, so be sure to replace that string's default "English" string with the name *of the language being translate* (instead of translating the name of the English language itself)
* **The syntax of SIC-1 Assembly Language is *not* localized**, so `subleq` and `.data` should *never* be localized (but non-ASCII identifiers *are* supported)
* **Some fields use HTML markup** (e.g. `<h3>Title</h3>`)--please use the same tags and *do not* use any additional tags (because they will not work) -- if additional tags are needed, open a issue with more details
* **Some fields supply a `{nbsp}` parameter for adding non-breaking spaces**--this is generally just for aligning "to" and "from" lines for aesthetic purposes--consider this optional, but recommended
* Note that Steam achievements when windowed are produced by Steam's UI, so they use the game's language as selected in Steam and *not* SIC-1's own localized strings

Here's a quick guide to prefixes used in the naming scheme for strings in the JSON files:

* "button": Text on a button in the UI
* "checkbox": Label on a checkbox in the UI
* "compilationError": Text for SIC-1 assembler error messages
* "contact_": Names and titles of characters used in mail to/from lines
* "content": HTML markup shown in a message box (or other large chunk of text)
* "header": Headings shown in the UI (either paragraph headings or table headings)
* "mailsX_Y": Content for in-game story mails where X is the "level" (number of tasks solved) and Y is the position of that email within the group, for example mails0_0 is the very first mail (which happens to be the SIC-1 Assembly manual); note that these are often fairly large with a lot of markup!
* "puzzle": Content related to the in-game tasks/puzzles/levels/challenges
* "tooltip": Text shown in tooltips
* "window": Titles of in-game message boxes