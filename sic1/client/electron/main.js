const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");

const createWindow = () => {
    const browserWindow = new BrowserWindow({
        width: 1600,
        height: 1200,
        backgroundColor: "#000000",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            sandbox: false,
        },
    });

    // Load index.html!
    browserWindow.loadFile(path.join(process.resourcesPath, "dist", "index.html"));
    browserWindow.on("ready-to-show", () => {
        browserWindow.removeMenu();
        browserWindow.show();
        browserWindow.maximize();
        browserWindow.focus();
    });

    // Setup fullscreen messaging
    ipcMain.on("get-fullscreen", (event) => {
        event.returnValue = browserWindow.isFullScreen();
    });

    ipcMain.handle("set-fullscreen", (_event, fullscreen) => {
        browserWindow.setFullScreen(fullscreen);
    });

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
