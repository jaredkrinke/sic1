const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, crashReporter, ipcMain, shell } = require("electron");

// Setup crash reporting
crashReporter.start({
    productName: 'sic1-steam-electron-cpp',
    companyName: 'apg',
    submitURL: 'https://submit.backtrace.io/apg/fbaed09374aa462ea726d1d3e8226077462322a4d89d4d8fa524c5ab05e054f1/minidump',
    uploadToServer: true,
});

// Setup main window
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

        // Switch to full-screen automatically, if needed
        browserWindow.webContents.send("launch-fullscreen-if-necessary");
    });

    // Setup data path
    ipcMain.on("get-user-data-root", (event) => {
        event.returnValue = app.getPath("userData");
    });

    // Setup full-screen messaging
    ipcMain.on("get-fullscreen", (event) => {
        event.returnValue = browserWindow.isFullScreen();
    });

    ipcMain.handle("set-fullscreen", (_event, fullscreen) => {
        browserWindow.setFullScreen(fullscreen);
    });

    browserWindow.webContents.setWindowOpenHandler((details) => {
        // Instead of opening a new Electron window, open a new default browser window
        shell.openExternal(details.url);
        return { action: "deny" };
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
