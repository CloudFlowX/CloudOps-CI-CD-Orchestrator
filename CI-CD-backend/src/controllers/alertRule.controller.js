import AlertRule from "../models/alertRule.model.js";
import logger from "../config/logger.js";

export const getAlertRules = async (req, res) => {
  try {
    const rules = await AlertRule.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, rules });
  } catch (error) {
    logger.error("GET ALERT RULES ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAlertRule = async (req, res) => {
  try {
    const { name, service, condition, channels, severity, enabled } = req.body;
    const rule = new AlertRule({ name, service, condition, channels, severity, enabled });
    await rule.save();
    return res.status(201).json({ success: true, rule });
  } catch (error) {
    logger.error("CREATE ALERT RULE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAlertRule = async (req, res) => {
  try {
    const { id } = req.params;
    await AlertRule.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Rule deleted" });
  } catch (error) {
    logger.error("DELETE ALERT RULE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleAlertRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await AlertRule.findById(id);
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
    rule.enabled = !rule.enabled;
    await rule.save();
    return res.status(200).json({ success: true, rule });
  } catch (error) {
    logger.error("TOGGLE ALERT RULE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
