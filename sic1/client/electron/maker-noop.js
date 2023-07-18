// Electron Forge seems to require at least one Maker, but I just want it to produce a plain old directory, so this is
// a trivial no-op Maker...

const { MakerBase } = require("@electron-forge/maker-base");

class MakerNoop extends MakerBase {
    // TODO: Why isn't this list provided in MakerBase?
    defaultPlatforms =  [
        "darwin",
        "linux",
        "win32",
    ];

    isSupportedOnCurrentPlatform() {
        return true;
    }

    make() {
        return Promise.resolve([]);
    }
}

module.exports = MakerNoop;
