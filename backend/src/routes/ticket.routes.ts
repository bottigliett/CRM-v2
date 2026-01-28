import express from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  addTicketMessage,
  assignTicket,
  logTime,
  closeTicket,
  reopenTicket,
  getClientTickets,
  createClientTicket,
  getClientTicketById,
  addClientTicketMessage,
} from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

/**
 * ADMIN ROUTES - Gestione completa ticket
 */
router.get('/', authenticate, getTickets);
router.get('/:id', authenticate, getTicketById);
router.post('/', authenticate, createTicket);
router.put('/:id', authenticate, updateTicket);
router.delete('/:id', authenticate, deleteTicket);

// Azioni ticket
router.post('/:id/messages', authenticate, addTicketMessage);
router.post('/:id/assign', authenticate, assignTicket);
router.post('/:id/log-time', authenticate, logTime);
router.post('/:id/close', authenticate, closeTicket);
router.post('/:id/reopen', authenticate, reopenTicket);

/**
 * CLIENT ROUTES - Gestione ticket propri
 * Nota: le routes client sono sotto /api/client/tickets (registrate separatamente)
 */
export const clientTicketRouter = express.Router();
clientTicketRouter.get('/', authenticateClient, getClientTickets);
clientTicketRouter.get('/:id', authenticateClient, getClientTicketById);
clientTicketRouter.post('/', authenticateClient, createClientTicket);
clientTicketRouter.post('/:id/messages', authenticateClient, addClientTicketMessage);

export default router;
