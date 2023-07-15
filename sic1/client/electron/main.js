const fs = require("fs");
const path = require("path");
const { app, BrowserWindow } = require("electron");

const createWindow = () => {
    const browserWindow = new BrowserWindow({
        width: 1600,
        height: 1200,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            sandbox: false,
        },
    });

    // Load index.html!
    browserWindow.maximize();
    browserWindow.loadFile(path.join(process.resourcesPath, "dist", "index.html"));

    // Open debugging tools when in development mode
    if (fs.existsSync("steam_appid.txt")) {
        browserWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
