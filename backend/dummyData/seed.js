require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
require("../models/clientModel");
require("../models/projectModel");
require("../models/eventModel");
require("../models/paymentModel");

const Client = mongoose.model("Client");
const Project = mongoose.model("Project");
const Event = mongoose.model("Event");
const Payment = mongoose.model("Payment");

const clientsData = require("./clients");
const projectsData = require("./projects");
const eventsData = require("./events");
const paymentsData = require("./payments");

async function seedData() {
  try {
    const dbName = "studioos";
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error("❌ MONGODB_URI is not set in .env");
      process.exit(1);
    }

    console.log(`⏳ Connecting to MongoDB at ${mongoUri}/${dbName}...`);
    await mongoose.connect(mongoUri, {
      dbName: "studioos",
    });
    console.log("✅ MongoDB Connected");

    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      Client.deleteMany({}),
      Project.deleteMany({}),
      Event.deleteMany({}),
      Payment.deleteMany({}),
    ]);
    console.log("✅ Data cleared");

    console.log("🌱 Seeding Clients...");
    const clients = await Client.insertMany(clientsData);
    const clientMap = {};
    clients.forEach((c) => {
      clientMap[c.name] = c._id;
    });

    console.log("🌱 Seeding Projects...");
    const projectsWithClientRef = projectsData.map((p) => {
      const clientId = clientMap[p.clientName];
      if (!clientId) console.warn(`⚠️ Client not found for project: ${p.projectName}`);
      return { ...p, clientRef: clientId }; // We keep clientName as per schema, but we use clientName mapping for relationships
    });
    
    // In our schema, Project has clientName (String) but Event/Payment have projectId (ObjectId).
    // Let's insert projects
    const projects = await Project.insertMany(projectsWithClientRef);
    const projectMap = {};
    projects.forEach((p) => {
      projectMap[p.projectName] = p._id;
    });

    console.log("🌱 Seeding Events...");
    const eventsWithProjectRef = eventsData.map((e) => {
      const projId = projectMap[e.projectName];
      if (!projId) console.warn(`⚠️ Project not found for event: ${e.eventName}`);
      return { ...e, projectId: projId };
    });
    await Event.insertMany(eventsWithProjectRef);

    console.log("🌱 Seeding Payments...");
    const paymentsWithProjectRef = paymentsData.map((p) => {
      const projId = projectMap[p.projectName];
      if (!projId) console.warn(`⚠️ Project not found for payment: ${p.amount}`);
      return { ...p, projectId: projId };
    });
    // Create payments one by one to trigger any advance/balance calculation logic if using `createPayment`
    // Wait, since we are seeding dummy data directly with balance/advance pre-calculated in projects, insertMany is fine.
    await Payment.insertMany(paymentsWithProjectRef);

    console.log("🎉 All dummy data seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedData();
