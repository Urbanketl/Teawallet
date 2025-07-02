import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/authController";
import { storage } from "../storage";

const router = Router();

// All analytics routes require admin access
router.use(requireAuth);
router.use(requireAdmin);

router.get('/popular-teas', async (req, res) => {
  try {
    const { start, end } = req.query;
    const popularTeas = await storage.getPopularTeaTypes(start as string, end as string);
    res.json(popularTeas);
  } catch (error) {
    console.error("Error fetching popular tea types:", error);
    res.status(500).json({ message: "Failed to fetch popular tea types" });
  }
});

router.get('/peak-hours', async (req, res) => {
  try {
    const { start, end } = req.query;
    const peakHours = await storage.getPeakHours(start as string, end as string);
    res.json(peakHours);
  } catch (error) {
    console.error("Error fetching peak hours:", error);
    res.status(500).json({ message: "Failed to fetch peak hours" });
  }
});

router.get('/machine-performance', async (req, res) => {
  try {
    const { start, end } = req.query;
    const performance = await storage.getMachinePerformance(start as string, end as string);
    res.json(performance);
  } catch (error) {
    console.error("Error fetching machine performance:", error);
    res.status(500).json({ message: "Failed to fetch machine performance" });
  }
});

router.get('/user-behavior', async (req, res) => {
  try {
    const { start, end } = req.query;
    const insights = await storage.getUserBehaviorInsights(start as string, end as string);
    res.json(insights);
  } catch (error) {
    console.error("Error fetching user behavior insights:", error);
    res.status(500).json({ message: "Failed to fetch user behavior insights" });
  }
});

router.get('/machine-dispensing', async (req, res) => {
  try {
    const { start, end, machineId } = req.query;
    const dispensingData = await storage.getMachineDispensingData(
      start as string, 
      end as string, 
      machineId as string
    );
    res.json(dispensingData);
  } catch (error) {
    console.error("Error fetching machine dispensing data:", error);
    res.status(500).json({ message: "Failed to fetch machine dispensing data" });
  }
});

export default router;