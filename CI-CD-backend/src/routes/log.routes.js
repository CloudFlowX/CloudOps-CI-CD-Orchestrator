import express from "express";
import { getLogs } from "../controllers/log.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/* =====================================================
   Get All Logs (Pipeline + System Logs)
===================================================== */
router.get("/", protect, authorize("admin", "developer", "viewer"), getLogs);

export default router;
