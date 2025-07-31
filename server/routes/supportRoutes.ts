import { Router } from "express";
import { 
  getUserSupportTickets, 
  createSupportTicket, 
  getSupportTicketById, 
  createSupportMessage,
  getFaqArticles,
  incrementFaqViews
} from "../controllers/supportController";
import { isAuthenticated } from "../auth";

const router = Router();

router.get('/tickets', isAuthenticated, getUserSupportTickets);
router.post('/tickets', isAuthenticated, createSupportTicket);
router.get('/tickets/:ticketId', isAuthenticated, getSupportTicketById);
router.post('/tickets/:ticketId/messages', isAuthenticated, createSupportMessage);
router.get('/faq', getFaqArticles);
router.post('/faq/:articleId/view', incrementFaqViews);

export default router;