import { Server } from "socket.io";
import logger from "./logger.js";
import os from "os";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info(`Client connected to Socket.IO: ${socket.id}`);
    socket.on("join", (userId) => {
      socket.join(userId);
      logger.info(`Socket ${socket.id} joined room ${userId}`);
    });
    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Calculate CPU Usage Helper
  let previousCpu = os.cpus();
  
  // Background task to emit live metrics
  setInterval(() => {
    const startCpu = previousCpu;
    const endCpu = os.cpus();
    previousCpu = endCpu;
    
    let idleDiff = 0;
    let totalDiff = 0;
    
    for (let i = 0; i < startCpu.length; i++) {
      const start = startCpu[i].times;
      const end = endCpu[i].times;
      
      const idle = end.idle - start.idle;
      const total = Object.values(end).reduce((acc, tv) => acc + tv, 0) - Object.values(start).reduce((acc, tv) => acc + tv, 0);
      
      idleDiff += idle;
      totalDiff += total;
    }
    
    const cpuUsage = totalDiff === 0 ? 0 : Math.round(100 - (100 * idleDiff / totalDiff));
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

    io.emit("system_metrics", {
      cpuUsage: cpuUsage,
      memoryUsage: memUsage,
      timestamp: new Date().toISOString()
    });
  }, 2000);

  // Stream REAL logs from Winston to Socket.IO!
  logger.on('data', (logObj) => {
    try {
      io.emit("system_logs", {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp: logObj.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 23),
        level: String(logObj.level).toUpperCase(),
        service: "CloudOps Orchestrator", // Always from backend
        message: logObj.message,
        stackTrace: logObj.stack,
        requestId: `req-internal`,
        traceId: `trace-backend`,
        environment: process.env.NODE_ENV || "development",
        containerId: `host-mac`
      });
    } catch(e) {}
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
