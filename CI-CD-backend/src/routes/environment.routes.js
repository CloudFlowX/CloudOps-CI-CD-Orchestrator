import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  getEnvironments,
  createEnvironment,
  getEnvVars,
  createEnvVar,
  getPipelineVariables,
  savePipelineVariables,
  syncAndRestartPipeline,
} from "../controllers/environment.controller.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// All roles can view, but only admin and developer can create
router
  .route("/")
  .get(authorize("admin", "developer", "viewer"), getEnvironments)
  .post(authorize("admin", "developer"), createEnvironment);

router
  .route("/vars")
  .get(authorize("admin", "developer", "viewer"), getEnvVars)
  .post(authorize("admin", "developer"), createEnvVar);

// Pipeline-specific environment variable routes
router
  .route("/pipeline-vars")
  .get(authorize("admin", "developer", "viewer"), getPipelineVariables);

router
  .route("/pipeline-vars/:pipelineId")
  .post(authorize("admin", "developer"), savePipelineVariables);

router
  .route("/sync-restart/:pipelineId")
  .post(authorize("admin", "developer"), syncAndRestartPipeline);

export default router;
