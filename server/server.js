const express = require("express");
const app = express();
const port = 4000;

// TODO: TLS
// TODO: Allow from supported origins

app.get("/tests/:testId/stats", function (request, response) {
    let testId = request.params.testId;

    // TODO: Use real data
    response.json({
        testId: testId,
        maxCount: 6,
        buckets: [
            { bucket: 9, count: 6 },
            { bucket: 12, count: 0 },
            { bucket: 15, count: 0 },
            { bucket: 18, count: 0 },
            { bucket: 21, count: 0 },
            { bucket: 24, count: 0 },
            { bucket: 27, count: 0 },
            { bucket: 30, count: 0 },
            { bucket: 33, count: 0 },
            { bucket: 36, count: 0 },
            { bucket: 39, count: 0 },
            { bucket: 42, count: 0 },
            { bucket: 45, count: 3 },
            { bucket: 48, count: 4 },
            { bucket: 51, count: 0 },
            { bucket: 54, count: 1 },
            { bucket: 57, count: 1 },
            { bucket: 60, count: 1 },
            { bucket: 63, count: 0 },
            { bucket: 66, count: 0 },
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
