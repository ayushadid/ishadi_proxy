import express from 'express';
import { MongoClient } from 'mongodb';
const app = express();
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

app.post('/insert/:collection', async (req, res) => {
  try {
    const collectionName = req.params.collection;
    const data = req.body;
    await db.collection(collectionName).insertMany(data);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Insert failed");
  }
});

client.connect().then(() => {
  db = client.db(); // uses DB name from URI
  app.listen(process.env.PORT || 3000, () => console.log("✅ Mongo proxy running"));
});
