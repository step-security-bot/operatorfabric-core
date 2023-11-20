const {MongoClient} = require('mongodb');
const {Aggregation} = require('mongodb');
const express = require('express');
const app = express();
const {performance} = require('perf_hooks');

// Connection URL
const url = 'mongodb://root:password@localhost:27017';

// Database Name
const dbName = 'operator-fabric';

// Collection Name
const collectionName = 'archivedCards';

// Create a new MongoClient
const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});

// Connect to the MongoDB server
client.connect(function (err) {
    if (err) {
        console.error('Error connecting to MongoDB:', err);
        return;
    }

    console.log('Connected successfully to MongoDB');

    // Access the database
    const db = client.db(dbName);

    // Access the collection
    const collection = db.collection(collectionName);

    // Define the API endpoint
    app.get('/documents', function (req, res) {
        // Get the page number and processStateKeys from the request query parameters
        const pageNumber = parseInt(req.query.pageNumber);
        const processStateKeys = req.query.processStateKeys ? req.query.processStateKeys.split(',') : [];
        console.log('processStateKeys:', processStateKeys);

        // Calculate skip value based on page number and page size
        const pageSize = 10; // Number of documents per page
        const skip = (pageNumber - 1) * pageSize;

        // Find documents based on processStateKey values with pagination
        const query = {};

        if (processStateKeys.length > 0) {
            query.processStateKey = {$in: processStateKeys};
        }

        // Start measuring the duration
        const startTime = performance.now();

        collection
            .find(query) // Exclude the data field from the result
            .project({
                uid: 1,
                publisher: 1,
                processVersion: 1,
                process: 1,
                processInstanceId: 1,
                state: 1,
                titleTranslated: 1,
                summaryTranslated: 1,
                publishDate: 1,
                startDate: 1,
                endDate: 1,
                publisherType: 1,
                representative: 1,
                representativeType: 1,
                entityRecipients: 1
            })

            .aggregate([
                {
                    $group: {
                        _id: {
                            process: '$process',
                            processInstanceId: '$processInstanceId'
                        },
                        latest: {$first: '$$ROOT'}
                    }
                }
            ])
            .project('latest')
            .andExclude('_id')
            .sort({publishDate: -1}) // Sort by publishDate in descending order
            .skip(skip)
            .limit(pageSize)
            .toArray(function (err, documents) {
                if (err) {
                    console.error('Error retrieving documents:', err);
                    res.status(500).send('Error retrieving documents');
                    return;
                }

                console.log('Retrieved documents done');

                // Get the total number of entries
                // BEGIN: ed8c6549bwf9
                collection.countDocuments(query, function (err, count) {
                    if (err) {
                        console.error('Error getting total count:', err);
                        res.status(500).send('Error getting total count');
                    } else {
                        console.log('Total number of entries:', count);

                        // Calculate the duration
                        const duration = performance.now() - startTime;
                        console.log('Request duration:', duration, 'ms');

                        // Print the RAM used by the program in megabytes
                        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
                        console.log('RAM used by the program:', memoryUsage.toFixed(2), 'MB');

                        // Send the response with the documents and total count
                        res.json({documents, count});
                    }
                });
                // END: ed8c6549bwf9
            });
    });

    // Start the server
    app.listen(3000, function () {
        console.log('Server started on port 3000');
    });
});
