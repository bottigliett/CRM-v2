import express from 'express';
import {
  getSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
} from '../controllers/sales-order.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getSalesOrders);
router.get('/:id', getSalesOrder);
router.post('/', createSalesOrder);
router.put('/:id', updateSalesOrder);
router.delete('/:id', deleteSalesOrder);

export default router;
