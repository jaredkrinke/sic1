const path = require("path");
const url = require("url");
const { app, BrowserWindow } = require("electron");

const createWindow = () => {
    const w = new BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            sandbox: false,
        },
    });

    // Load index.html!
    w.loadFile(path.join(process.resourcesPath, "dist", "index.html"));
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
