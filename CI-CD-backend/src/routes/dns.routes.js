import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  getPipelineDns,
  attachCustomDomain,
  verifyCustomDomain,
  autoSetupCloudflareDns,
} from "../controllers/dns.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route("/:pipelineId")
  .get(authorize("admin", "developer", "viewer"), getPipelineDns);

router
  .route("/:pipelineId/attach")
  .post(authorize("admin", "developer"), attachCustomDomain);

router
  .route("/:pipelineId/verify")
  .post(authorize("admin", "developer"), verifyCustomDomain);

router
  .route("/:pipelineId/cloudflare-auto")
  .post(authorize("admin", "developer"), autoSetupCloudflareDns);

export default router;
