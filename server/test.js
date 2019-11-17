const sqlite3 = require("sqlite3");
const pd = require("probability-distributions");

const arguments = process.argv.slice(2);
const db = new sqlite3.Database("test.db");
db.serialize();

function runAsync(sql) {
    return new Promise((resolve, reject) => {
        db.all(sql, (err, results) => {
            if (err !== null) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

const functions = {
    populate: async function(arguments) {
        await runAsync("CREATE TABLE IF NOT EXISTS Data (Id INTEGER PRIMARY KEY, Value INTEGER)");
    
        let count = parseInt(arguments[0]);
        if (count >= 0) {
            let values = pd.rnorm(count, parseInt(arguments[1]), parseInt(arguments[2])).map((v) => Math.max(1, Math.floor(v)));
            let valuesString = "";
            let first = true;
            for (let value of values) {
                if (first) {
                    first = false;
                } else {
                    valuesString += ", ";
                }
        
                valuesString += "(" + value + ")";
            }
        
            await runAsync("INSERT INTO Data (Value) VALUES " + valuesString);
        }
    },

    query: async function() {
        const bucketCount = 20;
        let boundsResults = await runAsync("SELECT MIN(Value) AS Min, MAX(Value) AS Max FROM Data");
        let bounds = (boundsResults.length > 0) ? boundsResults[0] : { Min: 1, Max: 20 };

        // Center the results if they're not spread out very much
        if ((bounds.Max - bounds.Min) < 20) {
            let newMin = Math.max(1, bounds.Min - 10);
            bounds.Max -= (newMin - bounds.Min);
            bounds.Min = newMin;
        }

        let bucketSize = Math.max(1, Math.ceil((bounds.Max - bounds.Min) / bucketCount));
        let results = await runAsync(
            `WITH Bucketed AS (SELECT (Value - ${bounds.Min}) / ${bucketSize} * ${bucketSize} + ${bounds.Min} AS Bucket FROM Data)
            SELECT Bucket, COUNT(*) AS Count, MIN(Bucket) AS Min FROM Bucketed GROUP BY Bucket ORDER BY Bucket ASC`);

        // Fill in any empty buckets with zeros; use the minimum value of populated buckets as the label
        let resultCount = results.length;
        let buckets = [];
        let maxCount = 0;
        for (let i = 0, j = 0; i < bucketCount; i++) {
            let bucket = bounds.Min + (bucketSize * i);
            let label = Math.floor(bucket + (bucketSize / 2));
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
                bucket: label,
                count: count,
            });
        }

        console.log(buckets);
    },
};

(async () => {
    await functions[arguments[0]](arguments.slice(1));
})()
    .catch((err) => {
        console.log("ERROR: " + err);
    })
    .finally(() => db.close());
