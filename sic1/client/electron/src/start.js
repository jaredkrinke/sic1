const { app, BrowserWindow } = require('electron');
const path = require("path");

// TODO: Why was this in the template?
app.allowRendererProcessReuse = false;

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 1200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.webContents.openDevTools();
    mainWindow.loadURL('file://' + __dirname + '/content/index.html');

    // TODO: Register "activate" handler and create a window if needed for macOS?
});
