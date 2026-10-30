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
          // If request fails, trigger alert for monitoring, but DO NOT corrupt or overwrite
          // the pipeline's completed CI/CD execution status ('success')!
          logger.warn(`Service health check warning for ${pipeline.name} at ${pipeline.deployedUrl}: ${error.message}`);
          try {
            const { triggerAlert } = await import("../utils/alertHelper.js");
            await triggerAlert({
              title: `Service Health Warning: ${pipeline.name}`,
              service: pipeline.name,
              message: `The deployed URL ${pipeline.deployedUrl} is unresponsive or returned an error: ${error.message}`,
              severity: "Medium",
              metric: "Uptime",
              threshold: "200 OK",
              currentValue: "Unresponsive"
            });
          } catch (e) {}
        }
      }
    } catch (error) {
      logger.error("Health Checker Error:", error.message);
    }
  });

  logger.info("🩺 Health Checker started (running every 30s)");
};
