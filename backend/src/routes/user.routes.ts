import { Router } from "express";
import {
  changeOwnPassword,
  checkEmployeeId,
  createUser,
  deleteUser,
  getPermissionLogs,
  getUserById,
  getUsers,
  updateUser,
  updateUserPermissions,
  updateUserStatus,
} from "../controllers/userController.js";
import {
  checkPermission,
  requireAuth,
} from "../middleware/authMiddleware.js";
import { requireOwner } from "../middleware/requireOwner.js";

const router = Router();

// Static paths must be registered before `/:id` so they are not captured as IDs.
router.put("/profile/password", requireAuth, changeOwnPassword);

router.get("/", requireAuth, checkPermission("Users", "view"), getUsers);
router.get(
  "/check-employee-id",
  requireAuth,
  checkPermission("Users", "view"),
  checkEmployeeId
);
router.post("/", requireAuth, checkPermission("Users", "create"), createUser);
router.get("/:id", requireAuth, checkPermission("Users", "view"), getUserById);
router.put("/:id", requireAuth, checkPermission("Users", "edit"), updateUser);
router.put(
  "/:id/status",
  requireAuth,
  checkPermission("Users", "manage"),
  updateUserStatus
);
router.put(
  "/:id/permissions",
  ...requireOwner,
  updateUserPermissions
);
router.get(
  "/:id/permission-logs",
  ...requireOwner,
  getPermissionLogs
);
router.delete(
  "/:id",
  requireAuth,
  checkPermission("Users", "delete"),
  deleteUser
);

export default router;
