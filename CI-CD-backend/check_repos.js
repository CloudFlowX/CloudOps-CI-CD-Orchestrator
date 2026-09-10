import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = "mongodb+srv://royalkhurana1_db_user:JTC0rQ5IillRRP8e@cluster0.u8k6lvt.mongodb.net/cloud_orchestrator?appName=Cluster0";

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    const repos = await db.collection('repositories').find({}).toArray();
    console.log("Total repos in DB:", repos.length);
    repos.forEach(r => console.log(r.name, r.githubUrl));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
