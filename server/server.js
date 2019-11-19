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
Database.prototype.runAsync = promisify(Database.prototype.run);
Database.prototype.runAndGetIdAsync = function (sql, params) {
    let db = this;
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err !== null) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

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

app.get("/tests/:testName/stats", function (request, response) {
    if (isTestName(request.params.testName)
        && isStatistic(request.query.cycles)
        && isStatistic(request.query.bytes)) {

        let testName = request.params.testName;
        let cycles = parseInt(request.query.cycles);
        let bytes = parseInt(request.query.bytes);

        // TODO: Use real data, including new values
        console.log(`Query for ${testName}, cycles=${cycles}, bytes=${bytes}`);
        response.json({
            cycles: [
                { bucket: 0, count: 1 },
                { bucket: 2, count: 0 },
                { bucket: 4, count: 4 },
                { bucket: 6, count: 20 },
                { bucket: 8, count: 2 },
                { bucket: 10, count: 0 },
                { bucket: 12, count: 100 },
                { bucket: 14, count: 64 },
                { bucket: 16, count: 8 },
                { bucket: 18, count: 0 },
                { bucket: 20, count: 2 },
                { bucket: 22, count: 10 },
                { bucket: 24, count: 4 },
                { bucket: 26, count: 0 },
                { bucket: 28, count: 0 },
                { bucket: 30, count: 0 },
                { bucket: 32, count: 0 },
                { bucket: 34, count: 2 },
                { bucket: 36, count: 3 },
                { bucket: 38, count: 1 },
            ],
            bytes: [
                { bucket: 0, count: 1 },
                { bucket: 2, count: 1 },
                { bucket: 4, count: 1 },
                { bucket: 6, count: 3 },
                { bucket: 8, count: 2 },
                { bucket: 10, count: 0 },
                { bucket: 12, count: 0 },
                { bucket: 14, count: 0 },
                { bucket: 16, count: 4 },
                { bucket: 18, count: 0 },
                { bucket: 20, count: 4 },
                { bucket: 22, count: 10 },
                { bucket: 24, count: 2 },
                { bucket: 26, count: 0 },
                { bucket: 28, count: 0 },
                { bucket: 30, count: 0 },
                { bucket: 32, count: 0 },
                { bucket: 34, count: 3 },
                { bucket: 36, count: 2 },
                { bucket: 38, count: 0 },
            ],
        });
    } else {
        response.status(statusCode.badRequest).send();
    }
});

async function handleResultAsync(testName, userStringId, userName, solutionCycles, solutionBytes, program) {
    console.log(`Upload for ${testName}: user ${userName} (${userStringId}): ${solutionCycles} cycles, ${solutionBytes} bytes: ${program}`);
    let userId = await db.runAndGetIdAsync("INSERT INTO User (StringId, Name) VALUES ($userStringId, $userName) ON CONFLICT (StringId) DO UPDATE SET StringId = excluded.StringId", {
        $userStringId: userStringId,
        $userName: userName,
    });

    let testId = await db.runAndGetIdAsync("INSERT INTO Test (Name, Validator) VALUES ($testName, '') ON CONFLICT DO NOTHING", {
        $testName: testName,
    });

    let solutionId = await db.runAndGetIdAsync("INSERT INTO Solution (TestId, Program, CyclesExecuted, BytesRead, Validated) VALUES ($testId, $program, $solutionCycles, $solutionBytes, FALSE)", {
        $testId: testId,
        $program: program,
        $solutionCycles: solutionCycles,
        $solutionBytes: solutionBytes,
    });

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
