import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/authController";
import { storage } from "../storage";

const router = Router();

// All analytics routes require admin access
router.use(requireAuth);
router.use(requireAdmin);

router.get('/peak-hours', async (req: any, res) => {
  try {
    const { start, end, businessUnitId, machineId } = req.query;
    console.log('Peak hours query params:', { start, end, businessUnitId, machineId });
    
    // SECURITY: Validate business unit access for non-super admins
    let validatedBusinessUnitId = businessUnitId as string;
    if (!req.isSuperAdmin) {
      if (businessUnitId) {
        // Specific business unit requested - validate access
        if (!req.accessibleBusinessUnitIds || !req.accessibleBusinessUnitIds.includes(businessUnitId)) {
          return res.status(403).json({ message: "Access denied to this business unit" });
        }
      } else {
        // No specific business unit - deny access (prevent data exposure)
        return res.status(400).json({ message: "Business unit ID is required for this endpoint" });
      }
    }
    
    const peakHours = await storage.getPeakHours(
      start as string, 
      end as string, 
      validatedBusinessUnitId,
      machineId as string
    );
    res.json(peakHours);
  } catch (error) {
    console.error("Error fetching peak hours:", error);
    res.status(500).json({ message: "Failed to fetch peak hours" });
  }
});

router.get('/machine-performance', async (req: any, res) => {
  try {
    const { start, end, businessUnitId, machineId } = req.query;
    console.log('Machine performance query params:', { start, end, businessUnitId, machineId });
    
    // SECURITY: Validate business unit access for non-super admins
    let validatedBusinessUnitId = businessUnitId as string;
    if (!req.isSuperAdmin) {
      if (businessUnitId) {
        // Specific business unit requested - validate access
        if (!req.accessibleBusinessUnitIds || !req.accessibleBusinessUnitIds.includes(businessUnitId)) {
          return res.status(403).json({ message: "Access denied to this business unit" });
        }
      } else {
        // No specific business unit - deny access (prevent data exposure)
        return res.status(400).json({ message: "Business unit ID is required for this endpoint" });
      }
    }
    
    const performance = await storage.getMachinePerformance(
      start as string, 
      end as string, 
      validatedBusinessUnitId,
      machineId as string
    );
    res.json(performance);
  } catch (error) {
    console.error("Error fetching machine performance:", error);
    res.status(500).json({ message: "Failed to fetch machine performance" });
  }
});

router.get('/user-behavior', async (req: any, res) => {
  try {
    const { start, end, businessUnitId, machineId } = req.query;
    console.log('User behavior query params:', { start, end, businessUnitId, machineId });
    
    // SECURITY: Validate business unit access for non-super admins
    let validatedBusinessUnitId = businessUnitId as string;
    if (!req.isSuperAdmin) {
      if (businessUnitId) {
        // Specific business unit requested - validate access
        if (!req.accessibleBusinessUnitIds || !req.accessibleBusinessUnitIds.includes(businessUnitId)) {
          return res.status(403).json({ message: "Access denied to this business unit" });
        }
      } else {
        // No specific business unit - deny access (prevent data exposure)
        return res.status(400).json({ message: "Business unit ID is required for this endpoint" });
      }
    }
    
    const insights = await storage.getUserBehaviorInsights(
      start as string, 
      end as string, 
      validatedBusinessUnitId,
      machineId as string
    );
    res.json(insights);
  } catch (error) {
    console.error("Error fetching user behavior insights:", error);
    res.status(500).json({ message: "Failed to fetch user behavior insights" });
  }
});

router.get('/revenue-trends', async (req: any, res) => {
  try {
    const { start, end, businessUnitId, machineId } = req.query;
    console.log('Revenue trends query params:', { start, end, businessUnitId, machineId });
    
    // SECURITY: Validate business unit access for non-super admins
    let validatedBusinessUnitId = businessUnitId as string;
    if (!req.isSuperAdmin) {
      if (businessUnitId) {
        // Specific business unit requested - validate access
        if (!req.accessibleBusinessUnitIds || !req.accessibleBusinessUnitIds.includes(businessUnitId)) {
          return res.status(403).json({ message: "Access denied to this business unit" });
        }
      } else {
        // No specific business unit - deny access (prevent data exposure)
        return res.status(400).json({ message: "Business unit ID is required for this endpoint" });
      }
    }
    
    // Note: getRevenueTrends now uses direct businessUnitId filtering
    const revenueTrends = await storage.getRevenueTrends(
      start as string, 
      end as string, 
      validatedBusinessUnitId,  // Validated business unit ID filtering
      machineId as string
    );
    res.json(revenueTrends);
  } catch (error) {
    console.error("Error fetching revenue trends:", error);
    res.status(500).json({ message: "Failed to fetch revenue trends" });
  }
});

router.get('/business-unit-comparison', async (req: any, res) => {
  try {
    const { start, end } = req.query;
    console.log('Business unit comparison query params:', { start, end });
    
    let comparison: any[] = [];
    
    if (req.isSuperAdmin) {
      // Super admins see all business units in comparison
      comparison = await storage.getBusinessUnitComparison(start as string, end as string);
    } else {
      // Business unit admins only see their accessible business units in comparison
      const allComparison = await storage.getBusinessUnitComparison(start as string, end as string);
      // Filter results to only include accessible business units
      if (req.accessibleBusinessUnitIds && req.accessibleBusinessUnitIds.length > 0) {
        comparison = allComparison.filter((unit: any) => 
          req.accessibleBusinessUnitIds.includes(unit.id)
        );
      } else {
        comparison = []; // No accessible business units
      }
    }
    
    res.json(comparison);
  } catch (error) {
    console.error("Error fetching business unit comparison:", error);
    res.status(500).json({ message: "Failed to fetch business unit comparison" });
  }
});

router.get('/machine-dispensing', async (req: any, res) => {
  try {
    const { start, end, businessUnitId, machineId } = req.query;
    console.log('Machine dispensing query params:', { start, end, businessUnitId, machineId });
    
    // SECURITY: Validate business unit access for non-super admins
    let validatedBusinessUnitId = businessUnitId as string;
    if (businessUnitId && !req.isSuperAdmin) {
      if (!req.accessibleBusinessUnitIds || !req.accessibleBusinessUnitIds.includes(businessUnitId)) {
        return res.status(403).json({ message: "Access denied to this business unit" });
      }
    }
    
    // Note: getMachineDispensingData parameter order is: startDate, endDate, machineId, businessUnitId
    const dispensingData = await storage.getMachineDispensingData(
      start as string, 
      end as string, 
      machineId as string,
      validatedBusinessUnitId
    );
    res.json(dispensingData);
  } catch (error) {
    console.error("Error fetching machine dispensing data:", error);
    res.status(500).json({ message: "Failed to fetch machine dispensing data" });
  }
});

export default router;