import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve .env path relative to project root (CI-CD-backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "./app.js";
import connectDB from "./config/db.js";
import logger from "./config/logger.js";
import { initSocket } from "./config/socket.js";
import { startHealthChecker } from "./services/health.service.js";
import http from "http";

const PORT = process.env.PORT || 5002;

// Validate critical env vars
if (!process.env.MONGODB_URI) {
  logger.error("❌ FATAL: MONGODB_URI is not defined in .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  logger.error("❌ FATAL: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// Connect Database then Start Server
const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Cloud Orchestrator API is running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`🔗 Health Check: http://localhost:${PORT}/`);
      
      // Start Health Checker
      startHealthChecker();
    });
  } catch (error) {
    logger.error("❌ Failed to start server: " + error.message);
    process.exit(1);
  }
};

startServer();