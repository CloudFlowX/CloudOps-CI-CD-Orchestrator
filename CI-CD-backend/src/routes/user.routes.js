import express from "express";
import { 
  getAllUsers, 
  getMyProfile, 
  updateProfile, 
  updateUserRole, 
  deleteUser,
  inviteUser 
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// =====================================================
// Current User Profile Routes
// =====================================================
router.route("/me")
  .get(getMyProfile);

router.route("/profile")
  .put(updateProfile);

// =====================================================
// Admin User Management Routes
// =====================================================
router.route("/")
  .get(authorize("admin"), getAllUsers);

router.route("/invite")
  .post(authorize("admin"), inviteUser);

router.route("/:id/role")
  .put(authorize("admin"), updateUserRole);

router.route("/:id")
  .delete(authorize("admin"), deleteUser);

export default router;
