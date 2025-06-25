import { Router } from "express";
import { 
  getUserTransactions, 
  createTransaction, 
  createPaymentOrder, 
  verifyPaymentAndAddFunds 
} from "../controllers/transactionController";
import { requireAuth } from "../controllers/authController";

const router = Router();

router.get('/', requireAuth, getUserTransactions);
router.post('/', requireAuth, createTransaction);
router.post('/payment/create-order', requireAuth, createPaymentOrder);
router.post('/payment/verify', requireAuth, verifyPaymentAndAddFunds);

export default router;