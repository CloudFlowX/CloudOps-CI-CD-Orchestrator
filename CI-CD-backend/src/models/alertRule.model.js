import mongoose from "mongoose";

const alertRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    service: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      required: true,
    },
    channels: {
      type: [String],
      default: ["System"],
    },
    severity: {
      type: String,
      enum: ["Info", "Warning", "Critical"],
      default: "Warning",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AlertRule", alertRuleSchema);
