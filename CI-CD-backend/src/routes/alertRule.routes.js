import express from "express";
import {
  getAlertRules,
  createAlertRule,
  deleteAlertRule,
  toggleAlertRule,
} from "../controllers/alertRule.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "developer"));

router.route("/")
  .get(getAlertRules)
  .post(createAlertRule);

router.route("/:id")
  .delete(deleteAlertRule);

router.route("/:id/toggle")
  .put(toggleAlertRule);

export default router;
