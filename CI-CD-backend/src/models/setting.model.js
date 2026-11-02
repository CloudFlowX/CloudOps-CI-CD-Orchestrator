import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    // General
    orgName: {
      type: String,
      default: "CloudOps Inc.",
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    buildTimeout: {
      type: Number,
      default: 30,
    },
    autoDeploy: {
      type: Boolean,
      default: true,
    },
    parallelBuilds: {
      type: Number,
      default: 5,
    },
    artifactRetention: {
      type: Number,
      default: 90,
    },
    retentionDays: {
      type: Number,
      default: 90,
    },
    buildCache: {
      type: Boolean,
      default: true,
    },

    // Notifications
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    primaryEmail: {
      type: String,
      default: "admin@cloudops.io",
    },
    digestFrequency: {
      type: String,
      default: "Instant",
    },
    slackNotifications: {
      type: Boolean,
      default: false,
    },
    slackWebhookUrl: {
      type: String,
      default: "",
    },
    pagerDutyNotifications: {
      type: Boolean,
      default: false,
    },
    pagerDutyKey: {
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
    notifyEvents: {
      buildSuccess: { type: Boolean, default: true },
      buildFailure: { type: Boolean, default: true },
      deployment: { type: Boolean, default: true },
      securityScan: { type: Boolean, default: true },
      pipelineCancelled: { type: Boolean, default: false },
    },

    // Security
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    sessionTimeout: {
      type: String,
      default: "1h",
    },
    ipWhitelist: {
      type: String,
      default: "192.168.1.0/24\n10.0.0.0/16",
    },
    apiTokens: [
      {
        id: Number,
        name: String,
        prefix: String,
        fullKey: String,
        createdDate: String,
        lastUsed: String,
        scopes: [String],
        status: { type: String, default: "active" },
      },
    ],

    // Integrations
    integrations: [
      {
        id: String,
        name: String,
        category: String,
        description: String,
        status: { type: String, default: "disconnected" },
        details: String,
        color: String,
        iconBg: String,
        lastSynced: String,
        config: mongoose.Schema.Types.Mixed,
      },
    ],

    // Billing
    selectedPlan: {
      type: String,
      default: "Enterprise",
    },
    paymentMethod: {
      cardBrand: { type: String, default: "Visa" },
      last4: { type: String, default: "4242" },
      expiry: { type: String, default: "08/2028" },
      cardholderName: { type: String, default: "DevOps Lead" },
    },
    invoices: [
      {
        id: String,
        date: String,
        amount: String,
        status: { type: String, default: "Paid" },
        period: String,
      },
    ],
  },
  { timestamps: true, strict: false }
);

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
