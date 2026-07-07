require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const projectRoutes = require("./routes/projectRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const eventRoutes = require("./routes/eventRoutes");
const clientRoutes = require("./routes/clientRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Root Route
app.get("/", (req, res) => {
  res.json({
    message: "📸 StudioOS Backend Running 🚀",
  });
});

// Routes
app.use("/api/projects", projectRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/clients", clientRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  const state = mongoose.connection.readyState;

  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  if (state === 1) {
    return res.json({
      success: true,
      message: "Backend and MongoDB are connected successfully.",
      database: mongoose.connection.name,
      status: stateMap[state],
    });
  }

  res.status(500).json({
    success: false,
    message: "MongoDB is not connected.",
    status: stateMap[state] || "unknown",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Server
const PORT = process.env.PORT || 5000;

module.exports = app;