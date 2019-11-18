const express = require("express");
const cors = require("cors");
const app = express();
const port = 4000;

// TODO: TLS

// TODO: Consider white-listing supported origins
app.use(cors());

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
    let testId = request.params.testId;
    let cycles = getOptionalQueryInt(request, "cycles");
    let bytes = getOptionalQueryInt(request, "bytes");

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
});

app.post("/tests/:testId/results", function (request, response) {
    // TODO: Implement uploading new results
    response.json("");
});

// Error handlers
app.all("/*", function (request, response) {
    console.log(`404: ${request.method} ${request.originalUrl}`);
    response.status(404).send("");
});

app.use(function (err, request, response, next) {
    console.error(err);
    response.status(500).send("");
});

app.listen(port, () => console.log(`Listening on port ${port}...`));
