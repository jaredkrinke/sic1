const express = require("express");
const cors = require("cors");
const { promisify } = require("util");
const { Database } = require("sqlite3");

const db = new Database("test.db");
const app = express();
const port = 4000;

// TODO: TLS

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO: Consider white-listing supported origins
app.use(cors());

// Promisify sqlite3 library
Database.prototype.allAsync = promisify(Database.prototype.all);
Database.prototype.getAsync = promisify(Database.prototype.get);
Database.prototype.runAsync = promisify(Database.prototype.run);

// Input validation
const statusCode = {
    badRequest: 400,
    notFound: 404,
    internalServerError: 500,
};

// TODO: Share constants across client and server
const testNameMaxLength = 200;
function isTestName(x) {
    return typeof(x) === "string" && x.length > 0 && x.length <= testNameMaxLength;
}

const statisticMax = 10000000;
function isStatistic(x) {
    let number = undefined;
    if (typeof(x) === "number") {
        number = x;
    } else if (typeof(x) === "string") {
        number = parseInt(x);
    }

    return number !== undefined && !isNaN(number) && number > 0 && number <= statisticMax;
}

const userIdPattern = /^[a-z]{15}$/;
function isUserId(x) {
    return typeof(x) === "string" && userIdPattern.test(x);
}

function isUserName(x) {
    return typeof(x) === "string" && x.length > 0 && x.length <= 50;
}

const programPattern = /^[0-9a-fA-F]+$/;
const programBytesMax = 252;
function isProgram(x) {
    return typeof(x) === "string"
        && programPattern.test(x)
        && (x.length % 2 === 0)
        && x.length >= 2
        && x.length <= programBytesMax * 2;
}

function getOptionalQueryInt(request, name) {
    if (request && request.query && request.query[name]) {
        let value = parseInt(request.query[name]);
        if (!isNaN(value)) {
            return value;
        }
    }
    return null;
}

// Routes and handlers
const bucketCount = 20;

async function handleStatAsync(testId, metric, value) {
    // TODO: Only look at validated solutions
    let boundsResults = await db.getAsync(`SELECT MIN(${metric}) AS Min, MAX(${metric}) AS Max FROM Solution WHERE TestId = $testId`, { $testId: testId });
    let bounds = (boundsResults.length > 0) ? boundsResults[0] : { Min: 1, Max: 20 };

    bounds.Min = Math.min(bounds.Min, value);
    bounds.Max = Math.max(bounds.Max, value);

    // Center the results if they're not spread out very much
    if ((bounds.Max - bounds.Min) < 20) {
        let newMin = Math.max(1, bounds.Min - 10);
        bounds.Max -= (newMin - bounds.Min);
        bounds.Min = newMin;
    }

    let bucketSize = Math.max(1, Math.ceil((bounds.Max - bounds.Min) / bucketCount));
    let results = await db.allAsync(
        `WITH Bucketed AS (SELECT (${metric} - ${bounds.Min}) / ${bucketSize} * ${bucketSize} + ${bounds.Min} AS Bucket FROM Solution WHERE TestId = $testId)
        SELECT Bucket, COUNT(*) AS Count, MIN(Bucket) AS Min FROM Bucketed GROUP BY Bucket ORDER BY Bucket ASC`, {
            $testId: testId
        });

    // Fill in any empty buckets with zeros
    let resultCount = results.length;
    let buckets = [];
    let maxCount = 0;
    for (let i = 0, j = 0; i < bucketCount; i++) {
        let bucket = bounds.Min + (bucketSize * i);
        let count = 0;
        for (; j < resultCount && results[j].Bucket <= bucket; j++) {
            if (results[j].Bucket === bucket) {
                lavel = results[j].Min;
                count = results[j].Count;

                if (count > maxCount) {
                    maxCount = count;
                }
            }
        }

        buckets.maxCount = maxCount;
        buckets.push({
            bucket: bucket,
            count: count,
        });
    }

    return buckets;
}

async function handleStatsAsync(testName, cycles, bytes) {
    let testId = (await db.getAsync("SELECT Id FROM Test WHERE Name = $testName", { $testName: testName })).Id;
    return {
        cycles: await handleStatAsync(testId, "CyclesExecuted", cycles),
        bytes: await handleStatAsync(testId, "BytesRead", bytes),
    }
}

app.get("/tests/:testName/stats", function (request, response) {
    if (isTestName(request.params.testName)
        && isStatistic(request.query.cycles)
        && isStatistic(request.query.bytes)) {

        let testName = request.params.testName;
        let cycles = parseInt(request.query.cycles);
        let bytes = parseInt(request.query.bytes);

        handleStatsAsync(request.params.testName, parseInt(request.query.cycles), parseInt(request.query.bytes))
            .then((data) => response.json(data))
            .catch((err) => {
                console.error(err);
                response.status(statusCode.internalServerError).send();
            });
    } else {
        response.status(statusCode.badRequest).send();
    }
});

async function handleResultAsync(testName, userStringId, userName, solutionCycles, solutionBytes, program) {
    console.log(`Upload for ${testName}: user ${userName} (${userStringId}): ${solutionCycles} cycles, ${solutionBytes} bytes: ${program}`);

    await db.runAsync("INSERT INTO User (StringId, Name) VALUES ($userStringId, $userName) ON CONFLICT (StringId) DO UPDATE SET StringId = excluded.StringId", {
        $userStringId: userStringId,
        $userName: userName,
    });

    let userId = (await db.getAsync("SELECT Id FROM USER WHERE StringId = $userStringId", { $userStringId: userStringId })).Id;

    await db.runAsync("INSERT INTO Test (Name, Validator) VALUES ($testName, '') ON CONFLICT DO NOTHING", { $testName: testName });
    let testId = (await db.getAsync("SELECT Id From Test WHERE Name = $testName", { $testName: testName })).Id;

    await db.runAsync("INSERT INTO Solution (TestId, Program, CyclesExecuted, BytesRead, Validated) VALUES ($testId, $program, $solutionCycles, $solutionBytes, FALSE)", {
        $testId: testId,
        $program: program,
        $solutionCycles: solutionCycles,
        $solutionBytes: solutionBytes,
    });

    let solutionId = (await db.getAsync("SELECT Id FROM Solution WHERE TestId = $testId AND Program = $program", {
        $testId: testId,
        $program: program,
    })).Id;

    await db.runAsync("INSERT INTO Result (UserId, SolutionId) VALUES ($userId, $solutionId)", {
        $userId: userId,
        $solutionId: solutionId,
    });
}

app.post("/tests/:testName/results", function (request, response) {
    if (isTestName(request.params.testName)
        && isUserId(request.body.userId)
        && isUserName(request.body.userName)
        && isStatistic(request.body.solutionCycles)
        && isStatistic(request.body.solutionBytes)
        && isProgram(request.body.program)) {

        handleResultAsync(
            request.params.testName,
            request.body.userId,
            request.body.userName,
            parseInt(request.body.solutionCycles),
            parseInt(request.body.solutionBytes),
            request.body.program
        )
            .then(() => response.send())
            .catch((err) => {
                console.error(err);
                response.status(statusCode.internalServerError).send();
            });
    } else {
        response.status(statusCode.badRequest).send();
    }
});

// Error handlers
app.all("/*", function (request, response) {
    console.log(`${statusCode.notFound}: ${request.method} ${request.originalUrl}`);
    response.status(statusCode.notFound).send();
});

app.use(function (err, request, response, next) {
    console.error(err);
    response.status(statusCode.internalServerError).send();
});

db.on("trace", console.log);

// Initialize database
Promise.all([
    db.runAsync("PRAGMA foreign_keys = ON"),
    db.runAsync(`
        CREATE TABLE IF NOT EXISTS User (
            Id INTEGER PRIMARY KEY,
            StringId VARCHAR(15) UNIQUE,
            Name VARCHAR(50)
        );
    `),
    db.runAsync(`
        CREATE TABLE IF NOT EXISTS Test (
            Id INTEGER PRIMARY KEY,
            Name VARCHAR(200) UNIQUE,
            Validator BLOB
        );
    `),
    db.runAsync(`
        CREATE TABLE IF NOT EXISTS Solution (
            Id INTEGER PRIMARY KEY,
            Program VARCHAR(512),
            TestId INTEGER REFERENCES Test(Id) ON DELETE CASCADE,
            CyclesExecuted INTEGER,
            BytesRead INTEGER,
            Validated BOOLEAN,
            CONSTRAINT UniqueSolution UNIQUE (TestId, Program) ON CONFLICT IGNORE
        );
    `),
    db.runAsync(`
        CREATE TABLE IF NOT EXISTS Result (
            Id INTEGER PRIMARY KEY,
            UserId INTEGER REFERENCES User(Id) ON DELETE CASCADE,
            SolutionId REFERENCES Solution(Id) ON DELETE CASCADE,
            CONSTRAINT UniqueResult UNIQUE (UserId, SolutionId) ON CONFLICT IGNORE
        );
    `),
]).then(() => {
        app.listen(port, () => console.log(`Listening on port ${port}...`));
    })
    .catch((err) => {
        throw err;
    });
