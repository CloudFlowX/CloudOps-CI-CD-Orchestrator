import express from "express";

import {
  createPipeline,
  getAllPipelines,
  getPipelineById,
  getPipelineLogs,
  updatePipeline,
  deletePipeline,
  triggerPipeline,
  runPipelineContainer,
  stopPipelineContainer,
  restartPipelineContainer,
  removePipelineContainer,
  getPipelineContainerStatus,
  getPipelineContainerLogs,
  getK8sPodsController,
  getK8sDeploymentsController,
  deployToK8s,
  scaleK8sDeploymentController,
  deleteK8sDeploymentController,
  githubActionsWebhook,
  scalePipeline,
  rollbackPipeline,
} from "../controllers/pipeline.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/* =====================================================
   GitHub Actions Webhook (Public or secret protected)
===================================================== */
router.post("/webhook/github", githubActionsWebhook);

/* =====================================================
   Create Pipeline
===================================================== */
router.post(
  "/",
  protect,
  authorize("admin", "developer"),
  createPipeline
);

/* =====================================================
   Get All Pipelines
===================================================== */
router.get(
  "/",
  protect,
  authorize("admin", "developer", "viewer"),
  getAllPipelines
);

/* =====================================================
   Get Pipeline By ID
===================================================== */

router.get(
  "/:id",
  protect,
  authorize("admin", "developer", "viewer"),
  getPipelineById
);

/* =====================================================
   Get Pipeline Logs
===================================================== */

router.get(
  "/:id/logs",
  protect,
  authorize("admin", "developer", "viewer"),
  getPipelineLogs
);

/* =====================================================
   Update Pipeline
===================================================== */

router.put(
  "/:id",
  protect,
  authorize("admin", "developer"),
  updatePipeline
);

/* =====================================================
   Delete Pipeline
===================================================== */

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deletePipeline
);

/* =====================================================
    Trigger Pipeline
===================================================== */

router.post(
  "/:id/trigger",
  protect,
  authorize("admin", "developer"),
  triggerPipeline
);

/* =====================================================
    Run Container
===================================================== */

router.post(
  "/:id/container/run",
  protect,
  authorize("admin", "developer"),
  runPipelineContainer
);

/* =====================================================
    Stop Container
===================================================== */

router.post(
  "/:id/container/stop",
  protect,
  authorize("admin", "developer"),
  stopPipelineContainer
);

/* =====================================================
    Restart Container
===================================================== */

router.post(
  "/:id/container/restart",
  protect,
  authorize("admin", "developer"),
  restartPipelineContainer
);

/* =====================================================
    Remove Container
===================================================== */

router.delete(
  "/:id/container/remove",
  protect,
  authorize("admin"),
  removePipelineContainer
);

/* =====================================================
    Container Status
===================================================== */

router.get(
  "/:id/container/status",
  protect,
  authorize("admin", "developer", "viewer"),
  getPipelineContainerStatus
);

/* =====================================================
    Container Logs
===================================================== */

router.get(
  "/:id/container/logs",
  protect,
  authorize("admin", "developer", "viewer"),
  getPipelineContainerLogs
);

/* =====================================================
    K8s: Get Pods
===================================================== */

router.get(
  "/:id/k8s/pods",
  protect,
  authorize("admin", "developer", "viewer"),
  getK8sPodsController
);

/* =====================================================
    K8s: Get Deployments
===================================================== */

router.get(
  "/:id/k8s/deployments",
  protect,
  authorize("admin", "developer", "viewer"),
  getK8sDeploymentsController
);

/* =====================================================
    K8s: Deploy
===================================================== */

router.post(
  "/:id/k8s/deploy",
  protect,
  authorize("admin", "developer"),
  deployToK8s
);

/* =====================================================
    K8s: Scale Deployment
===================================================== */

router.patch(
  "/:id/k8s/scale",
  protect,
  authorize("admin", "developer"),
  scaleK8sDeploymentController
);

/* =====================================================
    K8s: Delete Deployment
===================================================== */

router.delete(
  "/:id/k8s/deployment/:name",
  protect,
  authorize("admin"),
  deleteK8sDeploymentController
);

/* =====================================================
    Scale Pipeline
===================================================== */
router.post(
  "/:id/scale",
  protect,
  authorize("admin", "developer"),
  scalePipeline
);

/* =====================================================
    Rollback Pipeline
===================================================== */
router.post(
  "/:id/rollback",
  protect,
  authorize("admin", "developer"),
  rollbackPipeline
);

export default router;