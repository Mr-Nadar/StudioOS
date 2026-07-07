require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("======================================");
  console.log("📸 StudioOS Backend Started");
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📂 Projects API: http://localhost:${PORT}/api/projects`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/api/health`);
  console.log("======================================");
});