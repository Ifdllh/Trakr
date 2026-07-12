import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { calculateSuggestedBudgets } from "../services/budgetService";

export async function getBudgetSuggestions(req: AuthRequest, res: Response) {
  try {
    const userId = req.dbUserId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized. User ID not found." });
    }

    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month as string, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year as string, 10) : now.getFullYear();

    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ success: false, error: "Invalid month parameter. Must be between 1 and 12." });
    }

    if (isNaN(targetYear) || targetYear < 2000) {
      return res.status(400).json({ success: false, error: "Invalid year parameter." });
    }

    const suggestions = await calculateSuggestedBudgets(userId, targetMonth, targetYear);

    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    console.error("Error in getBudgetSuggestions controller:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error while calculating budget suggestions.",
    });
  }
}
