import express from 'express';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express(); // ✅ This must come first
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // ✅ Move here after `app` is declared

// MongoDB setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

// app.post('/insert/:collection', async (req, res) => {
//   try {
//     const collectionName = req.params.collection;
//     const data = req.body;
//     await db.collection(collectionName).insertMany(data);
//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Insert failed");
//   }
// });

app.post('/insert/:collection', async (req, res) => {
  try {
    const collectionName = req.params.collection;
    const data = req.body;
    const collection = db.collection(collectionName);

    const bulkOps = data.map(item => {
      let filterField;
      if (collectionName === 'time_logs') filterField = { Entry_ID: item.Entry_ID };
      else if (collectionName === 'unique_tasks') filterField = { Task_ID: item.Task_ID };
      else if (collectionName === 'sheet1') filterField = { Task_ID: item.Task_ID };

      return {
        updateOne: {
          filter: filterField,
          update: { $set: item },
          upsert: true
        }
      };
    });

    await collection.bulkWrite(bulkOps);
    res.json({ success: true, upserts: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upsert failed");
  }
});


// Route 1: Get duration summary per employee + task
app.get('/durations', async (req, res) => {
 const pipeline = [
  { $sort: { Employee: 1, Task_ID: 1, Timestamp: 1 } },
  { $group: {
    _id: { employee: "$Employee", task: "$Task_ID" },
    logs: {
      $push: {
        action: "$Action",
        timestamp: "$Timestamp"
      }
    }
  }},
  {
    $project: {
      _id: 0,
      Employee: "$_id.employee",
      Task_ID: "$_id.task",
      durations: {
        $map: {
          input: { $range: [0, { $size: "$logs" }, 2] },
          as: "idx",
          in: {
            $cond: [
              {
                $and: [
                  { $eq: [ { $arrayElemAt: [ "$logs.action", "$$idx" ] }, "Start" ] },
                  { $eq: [ { $arrayElemAt: [ "$logs.action", { $add: ["$$idx", 1] } ] }, "Stop" ] }
                ]
              },
              {
                $divide: [
                  {
                    $subtract: [
                      { $toDate: { $arrayElemAt: [ "$logs.timestamp", { $add: ["$$idx", 1] } ] } },
                      { $toDate: { $arrayElemAt: [ "$logs.timestamp", "$$idx" ] } }
                    ]
                  },
                  1000 * 60
                ]
              },
              0
            ]
          }
        }
      }
    }
  },
  {
    $project: {
      Employee: 1,
      Task_ID: 1,
      TotalDurationMinutes: { $sum: "$durations" }
    }
  }
];


const data = await db.collection('time_logs').aggregate(pipeline).toArray();
  res.json(data);
});

// Route 2: Get timestamps for employee+task
app.get('/details', async (req, res) => {
  const { employee, task } = req.query;
  const data = await db.collection('time_logs')
    .find({ Employee: employee, Task_ID: task })
    .sort({ Timestamp: 1 })
    .toArray();
  res.json(data);
});


client.connect().then(() => {
  db = client.db(); // uses DB name from URI
  app.listen(process.env.PORT || 3000, () => console.log("✅ Mongo proxy running"));
});
