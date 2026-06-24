import express from 'express';
import {
  getHelpDeskTickets,
  getHelpDeskTicket,
  createHelpDeskTicket,
  updateHelpDeskTicket,
  deleteHelpDeskTicket,
} from '../controllers/helpdesk.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getHelpDeskTickets);
router.get('/:id', getHelpDeskTicket);
router.post('/', createHelpDeskTicket);
router.put('/:id', updateHelpDeskTicket);
router.delete('/:id', deleteHelpDeskTicket);

export default router;
