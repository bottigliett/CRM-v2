import express from 'express';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  getPricingGuide,
} from '../controllers/quote.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Tutte le routes richiedono autenticazione
router.use(authenticate);

// Get pricing guide (helper tariffario)
router.get('/pricing-guide', getPricingGuide);

// CRUD preventivi
router.get('/', getQuotes);
router.get('/:id', getQuoteById);
router.post('/', createQuote);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);

export default router;
