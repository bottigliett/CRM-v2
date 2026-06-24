import express from 'express';
import {
  getVtQuotes,
  getVtQuote,
  createVtQuote,
  updateVtQuote,
  deleteVtQuote,
} from '../controllers/vt-quote.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getVtQuotes);
router.get('/:id', getVtQuote);
router.post('/', createVtQuote);
router.put('/:id', updateVtQuote);
router.delete('/:id', deleteVtQuote);

export default router;
