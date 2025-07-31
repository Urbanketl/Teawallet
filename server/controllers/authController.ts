import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export async function getCurrentUser(req: any, res: Response) {
  try {
    // Check for pseudo login parameter first
    const pseudoUserId = req.query.pseudo;
    const userId = pseudoUserId || req.user?.id || req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      if (pseudoUserId) {
        return res.status(404).json({ message: "Pseudo user not found" });
      }
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

export async function updateUserProfile(req: any, res: Response) {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updatedUser = await storage.updateUserProfile(userId, req.body);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
}

export function requireAuth(req: any, res: Response, next: NextFunction) {
  // First check for Replit Auth session
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
    return next();
  }
  
  // Then check for demo session
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function requireAdmin(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}