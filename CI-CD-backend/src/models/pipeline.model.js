import mongoose from "mongoose";

const pipelineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },

    branch: {
      type: String,
      default: "main",
    },

    buildCommand: {
      type: String,
      default: "",
    },

    dockerfilePath: {
      type: String,
      default: "./Dockerfile",
    },

    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "development",
    },

    visibility: {
      type: String,
      enum: ["team", "admin_only", "private"],
      default: "team",
    },

    deploymentTarget: {
      type: String,
      enum: ["docker", "kubernetes", "aws", "azure", "aws-s3", "cloudflare"],
      default: "cloudflare",
    },

    cloudflareProjectName: {
      type: String,
      default: "",
    },

    s3BucketName: {
      type: String,
      default: "",
    },

    cloudFrontUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "running", "success", "failed"],
      default: "pending",
    },

    containerId: {
      type: String,
      default: "",
    },

    containerPort: {
      type: Number,
      default: null,
    },

    envVars: [
      {
        key: {
          type: String,
          trim: true,
        },
        value: {
          type: String,
        },
        isSecret: {
          type: Boolean,
          default: false,
        },
      },
    ],

    cloudAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CloudAccount",
      default: null,
    },

    ec2InstanceId: {
      type: String,
      default: "",
    },

    appPort: {
      type: Number,
      default: 3000,
    },

    deployedUrl: {
      type: String,
      default: "",
    },

    customDomain: {
      type: String,
      default: "",
      trim: true,
    },

    domainStatus: {
      type: String,
      enum: ["none", "pending", "verified", "active", "error"],
      default: "none",
    },

    domainDnsRecord: {
      recordType: { type: String, default: "A" },
      name: { type: String, default: "" },
      value: { type: String, default: "" },
    },

    sslStatus: {
      type: String,
      enum: ["none", "pending", "active", "error"],
      default: "none",
    },

    logs: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pipeline", pipelineSchema);