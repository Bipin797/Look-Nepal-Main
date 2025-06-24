const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://looknepal:541bpsMn9v2b8IWe@looknepalcluster.ffr25sz.mongodb.net/?retryWrites=true&w=majority&appName=LookNepalCluster";

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
