const { Steam } = require("c-steam-api");

const appId = 2124440;

// TODO: Can this be run in main.js? Or is that in a different process?
// TODO: Restart if needed! Or make this optional in the API...
Steam.start(appId);

window.__getSteamUserName = () => Steam.getUserName();

// TODO: Setup a handler to shutdown via Steam.stop()
