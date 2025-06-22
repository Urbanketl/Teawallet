import { Router } from "express";
import { getCurrentUser, updateUserProfile, requireAuth } from "../controllers/authController";

const router = Router();

router.get('/user', requireAuth, getCurrentUser);
router.put('/user/profile', requireAuth, updateUserProfile);

export default router;