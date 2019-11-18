const express = require("express");
const cors = require("cors");
const app = express();
const port = 4000;

// TODO: TLS

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO: Consider white-listing supported origins
app.use(cors());

// Input validation
const statusCode = {
    badRequest: 400,
    notFound: 404,
    internalServerError: 500,
};

// TODO: Share constants across client and server
const testIdMaxLength = 200;
function isTestId(x) {
    return typeof(x) === "string" && x.length > 0 && x.length <= testIdMaxLength;
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

app.get("/tests/:testId/stats", function (request, response) {
    if (isTestId(request.params.testId)
        && isStatistic(request.query.cycles)
        && isStatistic(request.query.bytes)) {

        let testId = request.params.testId;
        let cycles = parseInt(request.query.cycles);
        let bytes = parseInt(request.query.bytes);

        // TODO: Use real data, including new values
        console.log(`Query for ${testId}, cycles=${cycles}, bytes=${bytes}`);
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

app.post("/tests/:testId/results", function (request, response) {
    if (isTestId(request.params.testId)
        && isUserId(request.body.userId)
        && isUserName(request.body.userName)
        && isStatistic(request.body.solutionCycles)
        && isStatistic(request.body.solutionBytes)
        && isProgram(request.body.program)) {

        let testId = request.params.testId;
        let userId = request.body.userId;
        let userName = request.body.userName;
        let solutionCycles = request.body.solutionCycles;
        let solutionBytes = request.body.solutionBytes;
        let program = request.body.program;

        console.log(`Upload for ${testId}: user ${userId} (${userName}): ${solutionCycles} cycles, ${solutionBytes} bytes: ${program}`);

        // TODO: Implement uploading new results
        response.json("");
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

app.listen(port, () => console.log(`Listening on port ${port}...`));
