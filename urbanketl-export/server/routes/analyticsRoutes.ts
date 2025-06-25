import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/authController";
import { storage } from "../storage";

const router = Router();

// All analytics routes require admin access
router.use(requireAuth);
router.use(requireAdmin);

router.get('/popular-teas', async (req, res) => {
  try {
    const popularTeas = await storage.getPopularTeaTypes();
    res.json(popularTeas);
  } catch (error) {
    console.error("Error fetching popular tea types:", error);
    res.status(500).json({ message: "Failed to fetch popular tea types" });
  }
});

router.get('/peak-hours', async (req, res) => {
  try {
    const peakHours = await storage.getPeakHours();
    res.json(peakHours);
  } catch (error) {
    console.error("Error fetching peak hours:", error);
    res.status(500).json({ message: "Failed to fetch peak hours" });
  }
});

router.get('/machine-performance', async (req, res) => {
  try {
    const performance = await storage.getMachinePerformance();
    res.json(performance);
  } catch (error) {
    console.error("Error fetching machine performance:", error);
    res.status(500).json({ message: "Failed to fetch machine performance" });
  }
});

router.get('/user-behavior', async (req, res) => {
  try {
    const insights = await storage.getUserBehaviorInsights();
    res.json(insights);
  } catch (error) {
    console.error("Error fetching user behavior insights:", error);
    res.status(500).json({ message: "Failed to fetch user behavior insights" });
  }
});

export default router;