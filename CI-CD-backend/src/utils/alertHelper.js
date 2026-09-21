import Alert from "../models/alert.model.js";
import { getIO } from "../config/socket.js";
import logger from "../config/logger.js";

export const triggerAlert = async ({ title, service, message, severity = "Critical", metric = "N/A", threshold = "N/A", currentValue = "N/A" }) => {
  try {
    const alert = new Alert({
      title,
      service,
      message,
      severity,
      metric,
      threshold,
      currentValue
    });
    await alert.save();
    
    // Broadcast via Socket.IO
    try {
      const io = getIO();
      io.emit("new_alert", {
        id: alert._id,
        title: alert.title,
        service: alert.service,
        description: alert.message,
        severity: alert.severity,
        status: alert.status,
        timestamp: new Date(alert.createdAt).toLocaleString(),
      });
    } catch (e) {
      // Socket not initialized yet, ignoring
    }
  } catch (error) {
    logger.error("Failed to trigger alert:", error);
  }
};
