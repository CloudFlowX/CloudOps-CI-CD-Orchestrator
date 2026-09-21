import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import repositoryRoutes from "./routes/repository.routes.js";
import pipelineRoutes from "./routes/pipeline.routes.js";
import githubRoutes from "./routes/github.routes.js";
import cloudAccountRoutes from "./routes/cloudAccount.routes.js";
import environmentRoutes from "./routes/environment.routes.js";
import userRoutes from "./routes/user.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import alertRuleRoutes from "./routes/alertRule.routes.js";
const app = express();

// ==========================
// Proxy Middleware (Must be before CORS/body-parsers)
// ==========================
import { proxySubdomains } from "./middleware/proxy.middleware.js";
app.use(proxySubdomains);

// ==========================
// Middlewares
// ==========================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==========================
// API Routes
// ==========================

// Authentication Routes
app.use("/api/v1/auth", authRoutes);

// Repository Routes
app.use("/api/v1/repositories", repositoryRoutes);

// Pipeline Routes
app.use("/api/v1/pipelines", pipelineRoutes);

// GitHub Actions Routes
app.use("/api/v1/github", githubRoutes);

// Cloud Accounts Routes
app.use("/api/v1/cloud-accounts", cloudAccountRoutes);

// Environments Routes
app.use("/api/v1/environments", environmentRoutes);

// User & Settings Routes
app.use("/api/v1/users", userRoutes);

// Audit Logs Routes
app.use("/api/v1/audit-logs", auditLogRoutes);

// Alerts Routes
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/alert-rules", alertRuleRoutes);

// ==========================
// Health Check Route
// ==========================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Cloud Orchestrator API Running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ==========================
// 404 Handler
// ==========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================
// Global Error Handler
// ==========================
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;