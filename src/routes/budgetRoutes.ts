import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getBudgetSuggestions } from "../controllers/budgetController";

const router = Router();

router.get("/suggest", requireAuth, getBudgetSuggestions);

export default router;
