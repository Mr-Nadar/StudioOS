const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "studioOs",
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
    throw err;
  }
};

module.exports = connectDB;