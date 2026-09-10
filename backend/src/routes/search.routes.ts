import { Router } from "express";
import { globalSearch } from "../controllers/searchController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, globalSearch);

export default router;
