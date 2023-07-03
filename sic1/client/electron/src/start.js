const { app, BrowserWindow } = require('electron')

// TODO: Why was this in the template?
app.allowRendererProcessReuse = false;

app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit();
});

app.on('ready', function() {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 1200,
        webPreferences: { nodeIntegration: true },
    });
    mainWindow.webContents.openDevTools();
    mainWindow.loadURL('file://' + __dirname + '/index.html');
});
