# SIC-1
This directory contains all of the code that is unique to SIC-1, the game (the sibling "lib" directory is a library for simulating a subleq computer--this is consumed by the game, but predates it). Note that the music tracks are not included in the repository.

## Targets
SIC-1 runs in a few different contexts:

### Clients
* Web/browser/itch.io - Web version of the SIC-1 game client (this was the original)
* Steam/WebView2 (Windows only) - Original Steam release, built on WebView2 (which only supports Windows)
* Steam/Electron (Linux via Proton, and Windows) - Port from WebView2 to Electron, to support Linux (via Proton Experimental) -- note: this is still in testing

Note that the game's HTML, CSS, JavaScript, and assets are identical between all client targets.

### Services
* Web (Netlify, GCP) - "Serverless" service for validating solutions uploaded from the web/itch.io client
* Steam (offline) - There actually isn't a SIC-1 service for Steam! Everything is done via Steam Leaderboards and offline analysis

## Source code organization
* lib/ - SIC-1 simulation library (which predates any attempt at making a game)
* sic1/shared/ - Code and definitions shared between the SIC-1 game client and server
* sic1/server/ - Service for validating SIC-1 solutions that are submitted from the web version of the game
* sic1/client/ - Client-specific code for all client implementations
* sic1/client/music/ - Not in the Git repository! This directory needs to be populated with the game's music tracks in order to successfully build/run locally
* sic1/client/windows/ - Root for the original WebView2-based Windows/Steam client
* sic1/client/windows/steam/ - Not in this repository! Unpack the Steam SDK here
* sic1/client/c-steam-api/ - This is a translation layer between Steam's C++/callback-based API and a flat C API that is synchronous/blocking, along with an async JavaScript API based on Koffi -- ideally, this could be spun off into a separate project for use elsewhere (the original motivation was that Greenworks, a Steam API layer for Electron, didn't support friend leaderboards, and I decided to just reuse my existing C++ Code for consumption from Node/JS)

## Building SIC-1 client(s)
Note: `npm install` is presumably needed in each directory with dependencies.

1. Clone the repository
1. Populate "sic1/client/music/" with the music tracks (in Ogg Vorbis format)
1. Populate "sic1/client/windows/steam/" with the Steam SDK (if building original WebView2-based game for Steam)
1. Build the sibling/top-level "lib" directory (sic1asm)
1. Build "sic1/shared/"
1. Run "sic1/client/windows/build.bat" to build the game (this will run `build:mail` and `build` in "sic1/client/", build the Windows binary, and archive everything--note: this doesn't build or archive the Electron target, currently)

## Building and deploying SIC-1 service
Note: The service is only needed to gain insight into (non-Steam) solutions, e.g. for generating charts.

TODO: Actual instructions

## Updating stats
Originally, stats were served from a live service, but now cached stats are *always* (and *only*) used in the game. This means the stats should be periodically updated to identify new records and increase the sample sizes of charts.

At a high level:

1. Download solutions uploaded via itch.io (browser) client and convert them to the common format
1. Download solutions from Steam and convert them to the common format
1. Merge all the solutions into the database
1. Sanity check output to find suspicious solutions
1. Save old stats and generate new stats (note: solutions are verified in this process)
1. Compare stats visually
1. Build and release!

Instructions for updating:

1. In `sic1/server/utils/`
1. Ensure Google Cloud access key is populated
1. Rename `archive.json` to `archive-YYYY-MM-DD.json`, based on its creation date
1. Run `ts-node download.ts YYYY-MM-DD > archive.json` (using the previous date)
1. Run `npm run transform`
1. Go to `sic1/tools/cli/`
1. Ensure Steam Web API key is populated
1. Run `npm run transform`
1. Run `npm run merge`
1. Optionally, move `comparison.txt` to `baseline.txt`, run `ts-node db-verify.ts > comparison.txt`, and diff the results (especially checking for improved top scores)
1. Run `npm run stats` to generate new stats
1. Rename `sic1/client/ts/stats-cache.ts` to `stats-cache-old.ts`
1. Copy the contents of `sic1/tools/cli/tmp.txt` into `sic1/client/ts/stats-cache.ts`
1. Optionally, visually compare distributions in `sic1/tools/` using `npm run stats` (it reads the old and current stats caches and shows the graphs)
1. In `sic1/client/`
1. Run `npm version patch` to update version
1. Run `build.bat` in a VS command prompt window
1. Upload to Steam
1. Upload to itch.io
