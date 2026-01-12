import express from 'express';
import {
  getClientAccesses,
  getClientAccessById,
  createClientAccess,
  updateClientAccess,
  deleteClientAccess,
  resendActivation,
  upgradeToFullClient,
} from '../controllers/client-access.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Tutte le routes richiedono autenticazione admin
router.use(authenticate);

// CRUD accessi client
router.get('/', getClientAccesses);
router.get('/:id', getClientAccessById);
router.post('/', createClientAccess);
router.put('/:id', updateClientAccess);
router.delete('/:id', deleteClientAccess);

// Azioni speciali
router.post('/:id/resend-activation', resendActivation);
router.post('/:id/upgrade-to-full', upgradeToFullClient);

export default router;
