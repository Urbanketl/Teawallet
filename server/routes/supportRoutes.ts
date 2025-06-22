import { Router } from "express";
import { 
  getUserSupportTickets, 
  createSupportTicket, 
  getSupportTicketById, 
  createSupportMessage,
  getFaqArticles,
  incrementFaqViews
} from "../controllers/supportController";
import { requireAuth } from "../controllers/authController";

const router = Router();

router.get('/tickets', requireAuth, getUserSupportTickets);
router.post('/tickets', requireAuth, createSupportTicket);
router.get('/tickets/:ticketId', requireAuth, getSupportTicketById);
router.post('/tickets/:ticketId/messages', requireAuth, createSupportMessage);
router.get('/faq', getFaqArticles);
router.post('/faq/:articleId/view', incrementFaqViews);

export default router;