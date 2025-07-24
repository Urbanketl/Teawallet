import { Router } from "express";
import { storage } from "../storage";
import { insertBusinessUnitSchema } from "@shared/schema";
import { z } from "zod";
// Use crypto for ID generation instead of nanoid
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const router = Router();

// Get all business units
router.get("/api/admin/business-units", async (req, res) => {
  try {
    const businessUnits = await storage.getAllBusinessUnits();
    res.json(businessUnits);
  } catch (error) {
    console.error("Error fetching business units:", error);
    res.status(500).json({ message: "Failed to fetch business units" });
  }
});

// Create business unit
router.post("/api/admin/business-units", async (req, res) => {
  try {
    const validatedData = insertBusinessUnitSchema.parse({
      ...req.body,
      id: generateId(),
    });
    
    const businessUnit = await storage.createBusinessUnit(validatedData);
    res.json(businessUnit);
  } catch (error) {
    console.error("Error creating business unit:", error);
    res.status(400).json({ message: "Failed to create business unit" });
  }
});

// Assign user to business unit
router.post("/api/admin/business-units/:unitId/users", async (req, res) => {
  try {
    const { unitId } = req.params;
    const { userId, role = "manager" } = req.body;
    
    await storage.assignUserToBusinessUnit(userId, unitId, role);
    res.json({ success: true });
  } catch (error) {
    console.error("Error assigning user to business unit:", error);
    res.status(400).json({ message: "Failed to assign user to business unit" });
  }
});

// Remove user from business unit
router.delete("/api/admin/business-units/:unitId/users/:userId", async (req, res) => {
  try {
    const { unitId, userId } = req.params;
    
    await storage.removeUserFromBusinessUnit(userId, unitId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing user from business unit:", error);
    res.status(400).json({ message: "Failed to remove user from business unit" });
  }
});

// Assign machine to business unit
router.post("/api/admin/business-units/:unitId/machines", async (req, res) => {
  try {
    const { unitId } = req.params;
    const { machineId } = req.body;
    
    const machine = await storage.assignMachineToBusinessUnit(machineId, unitId);
    res.json(machine);
  } catch (error) {
    console.error("Error assigning machine to business unit:", error);
    res.status(400).json({ message: "Failed to assign machine to business unit" });
  }
});

// Get business unit machines
router.get("/api/admin/business-units/:unitId/machines", async (req, res) => {
  try {
    const { unitId } = req.params;
    const machines = await storage.getBusinessUnitMachines(unitId);
    res.json(machines);
  } catch (error) {
    console.error("Error fetching business unit machines:", error);
    res.status(500).json({ message: "Failed to fetch business unit machines" });
  }
});

// Get unassigned machines
router.get("/api/admin/machines/unassigned", async (req, res) => {
  try {
    const machines = await storage.getUnassignedMachines();
    res.json(machines);
  } catch (error) {
    console.error("Error fetching unassigned machines:", error);
    res.status(500).json({ message: "Failed to fetch unassigned machines" });
  }
});

export default router;