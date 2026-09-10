import { Router } from "express";
import {
  handleGoogleWebhook,
  handleMetaWebhook,
  verifyMetaWebhook,
} from "../controllers/webhookController.js";

/**
 * Public ad-platform webhooks — intentionally NO JWT / requireAuth.
 * Auth is platform-specific:
 * - Meta GET: hub.verify_token === META_VERIFY_TOKEN
 * - Meta POST: Graph API fetch uses META_ACCESS_TOKEN
 * - Google POST: header google-key === GOOGLE_WEBHOOK_KEY
 */
const router = Router();

router.get("/meta", verifyMetaWebhook);
router.post("/meta", handleMetaWebhook);
router.post("/google", handleGoogleWebhook);

export default router;
