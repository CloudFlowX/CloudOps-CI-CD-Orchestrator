import express from "express";
import {
  connectCloudAccount,
  getCloudAccounts,
  updateCloudAccount,
  deleteCloudAccount,
  getAwsResources,
} from "../controllers/cloudAccount.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Connect new cloud account (Admin or Developer)
router.post("/", authorize("admin", "developer"), connectCloudAccount);

// Get all cloud accounts (All roles can view)
router.get("/", authorize("admin", "developer", "viewer"), getCloudAccounts);

// Update a cloud account (Admin or Developer)
router.put("/:id", authorize("admin", "developer"), updateCloudAccount);

// Delete a cloud account (Admin only)
router.delete("/:id", authorize("admin"), deleteCloudAccount);

// Fetch AWS resources for testing/display
router.get("/:id/resources/aws", authorize("admin", "developer", "viewer"), getAwsResources);

export default router;
