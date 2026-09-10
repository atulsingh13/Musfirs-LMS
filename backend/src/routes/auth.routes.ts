import { Router } from "express";
import {
  login,
  logout,
  getMe,
  forgotPassword,
  refreshToken,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  loginLimiter,
  forgotPasswordLimiter,
} from "../middleware/rateLimiters.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

export default router;
