import Setting from "../models/setting.model.js";
import logger from "../config/logger.js";

// @desc    Get system settings
// @route   GET /api/v1/settings
// @access  Private
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = await Setting.create({
        orgName: "CloudOps Inc.",
        defaultBranch: "main",
        buildTimeout: 30,
        autoDeploy: true,
        parallelBuilds: 5,
        artifactRetention: 90,
        retentionDays: 90,
        buildCache: true,
        emailNotifications: true,
        primaryEmail: req.user?.email || "admin@cloudops.io",
        digestFrequency: "Instant",
        slackNotifications: false,
        slackWebhookUrl: "",
        pagerDutyNotifications: false,
        pagerDutyKey: "",
        notifyEvents: {
          buildSuccess: true,
          buildFailure: true,
          deployment: true,
          securityScan: true,
          pipelineCancelled: false,
        },
        twoFactorAuth: false,
        sessionTimeout: "1h",
        ipWhitelist: "192.168.1.0/24\n10.0.0.0/16",
        selectedPlan: "Enterprise",
        paymentMethod: {
          cardBrand: "Visa",
          last4: "4242",
          expiry: "08/2028",
          cardholderName: req.user?.fullName || "DevOps Lead",
        },
      });
    }

    res.status(200).json({
      success: true,
      settings,
      data: settings,
    });
  } catch (error) {
    logger.error("Error in getSettings:", error);
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/v1/settings
// @access  Private (Admin/Developer)
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      settings = await Setting.findOneAndUpdate(
        {},
        { $set: req.body },
        {
          new: true,
          runValidators: false,
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Settings saved successfully",
      settings,
      data: settings,
    });
  } catch (error) {
    logger.error("Error in updateSettings:", error);
    next(error);
  }
};

// @desc    Test Slack Webhook delivery
// @route   POST /api/v1/settings/test-slack
// @access  Private
export const testSlackWebhook = async (req, res, next) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("https://hooks.slack.com")) {
      return res.status(400).json({
        success: false,
        message: "Invalid Slack webhook URL. It must begin with https://hooks.slack.com/services/...",
      });
    }

    const payload = {
      text: "🚀 *CloudOps CI/CD Orchestrator*: Test notification sent successfully! Your Slack integration is active and verified.",
    };

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!slackRes.ok) {
      const errText = await slackRes.text();
      return res.status(400).json({
        success: false,
        message: `Slack rejected webhook (${slackRes.status}): ${errText || "Invalid webhook response"}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Test message sent to Slack channel successfully!",
    });
  } catch (err) {
    logger.error("Error testing Slack webhook:", err);
    return res.status(500).json({
      success: false,
      message: `Failed to dispatch Slack webhook: ${err.message}`,
    });
  }
};
