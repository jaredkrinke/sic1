const { app, BrowserWindow } = require("electron");
const path = require("path");

const createWindow = () => {
    const w = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            sandbox: false,
        },
    });

    w.webContents.openDevTools();
    w.loadFile("index.html");
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
