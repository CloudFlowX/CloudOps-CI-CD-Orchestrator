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

    deploymentTarget: {
      type: String,
      enum: ["docker", "kubernetes", "aws", "azure"],
      default: "docker",
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