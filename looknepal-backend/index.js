const { MongoClient } = require("mongodb");
require("dotenv").config(); // Load environment variables from .env file

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    console.log("🔄 Attempting to connect...");
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db("looknepal");
    const jobs = db.collection("jobs");

    // Optional: Insert and retrieve data
    await jobs.insertOne({
      title: "Test Job",
      company: "Look Nepal",
      type: "Remote",
      posted: new Date(),
    });

    const allJobs = await jobs.find({}).toArray();
    console.log("📄 Jobs:", allJobs);
  } catch (error) {
    console.error("❌ Error connecting:", error.message);
  } finally {
    await client.close();
    console.log("🔌 Connection closed.");
  }
}

run();
