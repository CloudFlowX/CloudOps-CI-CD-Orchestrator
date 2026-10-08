import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    orgName: {
      type: String,
      default: "My Organization",
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    buildTimeout: {
      type: Number,
      default: 60,
    },
    autoDeploy: {
      type: Boolean,
      default: false,
    },
    parallelBuilds: {
      type: Number,
      default: 2,
    },
    retentionDays: {
      type: Number,
      default: 30,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    primaryEmail: {
      type: String,
      default: "",
    },
    digestFrequency: {
      type: String,
      enum: ["daily", "weekly", "never"],
      default: "daily",
    },
    slackNotifications: {
      type: Boolean,
      default: false,
    },
    slackWebhookUrl: {
      type: String,
      default: "",
    },
    teamsNotifications: {
      type: Boolean,
      default: false,
    },
    teamsWebhookUrl: {
      type: String,
      default: "",
    },
    webhookAlerts: {
      type: Boolean,
      default: false,
    },
    genericWebhookUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
