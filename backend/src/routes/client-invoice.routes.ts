import express from 'express';
import { getClientInvoices, getClientInvoiceById } from '../controllers/client-invoice.controller';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

// All routes require client authentication
router.get('/', authenticateClient, getClientInvoices);
router.get('/:id', authenticateClient, getClientInvoiceById);

export default router;
