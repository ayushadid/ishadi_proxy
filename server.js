// server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
app.use(express.json());

const MONGO_URI = 'mongodb+srv://ayushadid:npJ6maymWrs2U8y1@cluster0.eajjum2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // paste your URI here
const client = new MongoClient(MONGO_URI);
let db;

app.post('/insert/:collection', async (req, res) => {
  try {
    const data = req.body;
    const collection = req.params.collection;
    await db.collection(collection).insertMany(data);
    res.send({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).send("Insert failed");
  }
});

client.connect().then(() => {
  db = client.db(); // your database name is auto-selected from URI
  app.listen(3000, () => console.log("Listening on 3000"));
});
