import express from 'express';
import {
  verifyActivationToken,
  sendVerificationCode,
  verifyCode,
  completeActivation,
  clientLogin,
  getClientMe,
  changePassword,
} from '../controllers/client-auth.controller';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

/**
 * PUBLIC ROUTES - Attivazione e Login
 */

// Step 1: Verifica token attivazione
router.post('/verify-token', verifyActivationToken);

// Step 2: Invia codice verifica email
router.post('/send-verification-code', sendVerificationCode);

// Step 2.5: Verifica codice email
router.post('/verify-code', verifyCode);

// Step 3: Completa attivazione con password
router.post('/complete-activation', completeActivation);

// Login cliente
router.post('/login', clientLogin);

/**
 * PROTECTED ROUTES - Richiedono autenticazione CLIENT
 */

// Get dati cliente autenticato
router.get('/me', authenticateClient, getClientMe);

// Cambio password
router.post('/change-password', authenticateClient, changePassword);

export default router;
