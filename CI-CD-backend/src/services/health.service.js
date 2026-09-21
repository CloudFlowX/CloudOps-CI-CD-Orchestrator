import cron from "node-cron";
import axios from "axios";
import Pipeline from "../models/pipeline.model.js";
import { getIO } from "../config/socket.js";
import logger from "../config/logger.js";

export const startHealthChecker = () => {
  // Run every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      // Find pipelines that have a deployed URL and are not failed
      const pipelines = await Pipeline.find({
        deployedUrl: { $ne: "" },
        status: { $ne: "failed" },
      });

      for (const pipeline of pipelines) {
        try {
          const res = await axios.get(pipeline.deployedUrl, { timeout: 5000 });
          
          if (pipeline.status !== "success") {
             pipeline.status = "success";
             await pipeline.save();
             try {
                getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "success" });
             } catch(e) {}
          }
        } catch (error) {
          // If request fails, mark as offline/failed or just emit a specific event
          // Let's just update the status to 'failed' if it was success
          if (pipeline.status === "success") {
             logger.warn(`Health check failed for ${pipeline.name} at ${pipeline.deployedUrl}`);
             pipeline.status = "failed";
             await pipeline.save();
             try {
                getIO().emit("pipeline_status_changed", { id: pipeline._id, status: "failed" });
                
                const { triggerAlert } = await import("../utils/alertHelper.js");
                await triggerAlert({
                  title: `Health Check Failed: ${pipeline.name}`,
                  service: pipeline.name,
                  message: `The deployed URL ${pipeline.deployedUrl} is unresponsive. Error: ${error.message}`,
                  severity: "Critical",
                  metric: "Uptime",
                  threshold: "200 OK",
                  currentValue: "Offline"
                });
             } catch(e) {}
          }
        }
      }
    } catch (error) {
      logger.error("Health Checker Error:", error.message);
    }
  });

  logger.info("🩺 Health Checker started (running every 30s)");
};
