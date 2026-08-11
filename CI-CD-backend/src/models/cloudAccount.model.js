import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js";

const cloudAccountSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["AWS", "GCP", "Azure", "DigitalOcean"],
      default: "AWS",
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accessKeyId: {
      type: String, // Required for AWS
    },
    secretAccessKey: {
      type: String, // Required for AWS
    },
    region: {
      type: String, // Required for AWS
    },
    
    // ======================================
    // GCP Specific Fields
    // ======================================
    gcpProjectId: {
      type: String,
    },
    gcpClientEmail: {
      type: String,
    },
    gcpPrivateKey: {
      type: String,
    },

    // ======================================
    // Azure Specific Fields
    // ======================================
    azureTenantId: {
      type: String,
    },
    azureClientId: {
      type: String,
    },
    azureClientSecret: {
      type: String,
    },
    azureSubscriptionId: {
      type: String,
    },

    environment: {
      type: String,
      enum: ["Production", "Staging", "Development"],
      default: "Development",
    },
    status: {
      type: String,
      enum: ["connected", "error", "disconnected"],
      default: "connected",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to encrypt credentials before saving
cloudAccountSchema.pre("save", async function () {
  if (this.isModified("secretAccessKey") && this.secretAccessKey) {
    this.secretAccessKey = encrypt(this.secretAccessKey);
  }
  if (this.isModified("gcpPrivateKey") && this.gcpPrivateKey) {
    this.gcpPrivateKey = encrypt(this.gcpPrivateKey);
  }
  if (this.isModified("azureClientSecret") && this.azureClientSecret) {
    this.azureClientSecret = encrypt(this.azureClientSecret);
  }
});

// Virtual or method could be used, but let's decrypt when finding manually in controllers or using a post-find hook
cloudAccountSchema.post(["find", "findOne"], function (docs) {
  if (!docs) return;
  const decryptDoc = (doc) => {
    if (doc.secretAccessKey) doc.secretAccessKey = decrypt(doc.secretAccessKey);
    if (doc.gcpPrivateKey) doc.gcpPrivateKey = decrypt(doc.gcpPrivateKey);
    if (doc.azureClientSecret) doc.azureClientSecret = decrypt(doc.azureClientSecret);
  };
  
  if (Array.isArray(docs)) {
    docs.forEach(decryptDoc);
  } else {
    decryptDoc(docs);
  }
});

const CloudAccount = mongoose.model("CloudAccount", cloudAccountSchema);

export default CloudAccount;
