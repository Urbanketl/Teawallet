import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/authController";
import { storage } from "../storage";

const router = Router();

// All analytics routes require admin access
router.use(requireAuth);
router.use(requireAdmin);

router.get('/peak-hours', async (req, res) => {
  try {
    const { start, end, businessUnitId } = req.query;
    console.log('Peak hours query params:', { start, end, businessUnitId });
    const peakHours = await storage.getPeakHours(
      start as string, 
      end as string, 
      businessUnitId as string
    );
    res.json(peakHours);
  } catch (error) {
    console.error("Error fetching peak hours:", error);
    res.status(500).json({ message: "Failed to fetch peak hours" });
  }
});

router.get('/machine-performance', async (req, res) => {
  try {
    const { start, end, businessUnitId } = req.query;
    console.log('Machine performance query params:', { start, end, businessUnitId });
    const performance = await storage.getMachinePerformance(
      start as string, 
      end as string, 
      businessUnitId as string
    );
    res.json(performance);
  } catch (error) {
    console.error("Error fetching machine performance:", error);
    res.status(500).json({ message: "Failed to fetch machine performance" });
  }
});

router.get('/user-behavior', async (req, res) => {
  try {
    const { start, end, businessUnitId } = req.query;
    console.log('User behavior query params:', { start, end, businessUnitId });
    const insights = await storage.getUserBehaviorInsights(
      start as string, 
      end as string, 
      businessUnitId as string
    );
    res.json(insights);
  } catch (error) {
    console.error("Error fetching user behavior insights:", error);
    res.status(500).json({ message: "Failed to fetch user behavior insights" });
  }
});

router.get('/revenue-trends', async (req, res) => {
  try {
    const { start, end, businessUnitId } = req.query;
    console.log('Revenue trends query params:', { start, end, businessUnitId });
    // Note: getRevenueTrends uses businessUnitAdminId parameter for filtering
    const revenueTrends = await storage.getRevenueTrends(
      start as string, 
      end as string, 
      businessUnitId as string  // This will be passed as businessUnitAdminId
    );
    res.json(revenueTrends);
  } catch (error) {
    console.error("Error fetching revenue trends:", error);
    res.status(500).json({ message: "Failed to fetch revenue trends" });
  }
});

router.get('/business-unit-comparison', async (req, res) => {
  try {
    const { start, end } = req.query;
    console.log('Business unit comparison query params:', { start, end });
    const comparison = await storage.getBusinessUnitComparison(start as string, end as string);
    res.json(comparison);
  } catch (error) {
    console.error("Error fetching business unit comparison:", error);
    res.status(500).json({ message: "Failed to fetch business unit comparison" });
  }
});

router.get('/machine-dispensing', async (req, res) => {
  try {
    const { start, end, businessUnitId, machineId } = req.query;
    console.log('Machine dispensing query params:', { start, end, businessUnitId, machineId });
    // Note: getMachineDispensingData parameter order is: startDate, endDate, machineId, businessUnitId
    const dispensingData = await storage.getMachineDispensingData(
      start as string, 
      end as string, 
      machineId as string,
      businessUnitId as string
    );
    res.json(dispensingData);
  } catch (error) {
    console.error("Error fetching machine dispensing data:", error);
    res.status(500).json({ message: "Failed to fetch machine dispensing data" });
  }
});

export default router;