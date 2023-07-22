const fs = require("fs");
const path = require("path");

function copyToDirectory(filePath, directoryPath) {
  fs.copyFileSync(filePath, path.join(directoryPath, path.basename(filePath)));
}

module.exports = {
  packagerConfig: {
    asar: false,
    extraResource: [
      "../dist",
    ],
    afterExtract: [
      (buildPath, electronVersion, platform, arch, callback) => {
        try {
          // Copy extra files to the package root
          const targetSpecificFiles = {
            "win32-x64": ["../windows/steam/sdk/redistributable_bin/win64/steam_api64.dll"],
            "linux-x64": ["../windows/steam/sdk/redistributable_bin/linux64/libsteam_api.so"],
          };

          for (const filePath of [
            ...targetSpecificFiles[`${platform}-${arch}`],
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
