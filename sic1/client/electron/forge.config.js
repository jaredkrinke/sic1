const fs = require("fs");
const path = require("path");

function copyToDirectory(filePath, directoryPath) {
  fs.copyFileSync(filePath, path.join(directoryPath, path.basename(filePath)));
}

module.exports = {
  packagerConfig: {
    asar: false,
    afterExtract: [
      (buildPath, electronVersion, platform, arch, callback) => {
        try {
          // Copy extra files to the package root
          for (const filePath of [
            "../windows/x64/Release/c-steam-api.dll",
            "../windows/steam/sdk/redistributable_bin/win64/steam_api64.dll",
            "../windows/steam_appid.txt", // TODO: Remove this during packaging!
          ]) {
            copyToDirectory(filePath, buildPath);
          }

          callback();
        } catch (e) {
          callback(e);
        }
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: './maker-noop.js',
    },
  ],
  plugins: [
  ],
};
