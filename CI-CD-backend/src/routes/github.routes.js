import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { 
  getGitHubActionsRuns, 
  triggerGitHubAction,
  getAuthUrl,
  connectGithub,
  disconnectGithub,
  getRepositories,
  getBranches
} from "../controllers/github.controller.js";

const router = express.Router();

// Existing routes
router.get("/runs", protect, authorize("admin", "developer", "viewer"), getGitHubActionsRuns);
router.post("/trigger", protect, authorize("admin", "developer"), triggerGitHubAction);

// New Integration Routes
router.get("/auth-url", protect, getAuthUrl);
router.post("/connect", protect, connectGithub);
router.delete("/disconnect", protect, disconnectGithub);
router.get("/repositories", protect, getRepositories);
router.get("/repositories/:owner/:repo/branches", protect, getBranches);

export default router;
