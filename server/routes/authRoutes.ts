import { Router } from "express";
import { isAuthenticated } from "../auth";

const router = Router();

// Get current user session
router.get('/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json(req.user);
});

// Update user profile
router.put('/user/profile', isAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user!.id;
    
    // Update user profile logic would go here
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;