import express from 'express';
import {
  verifyUsername,
  verifyActivationCode,
  completeManualActivation,
  clientLogin,
} from '../controllers/client-auth.controller';

const router = express.Router();

/**
 * ACTIVATION ROUTES - NO AUTHENTICATION REQUIRED
 * These routes are completely public for client activation process
 */

// Step 1: Verify username exists and is not activated
router.post('/verify-username', verifyUsername);

// Step 2: Verify activation code
router.post('/verify-code', verifyActivationCode);

// Step 3: Complete activation with password
router.post('/complete', completeManualActivation);

// Client login (after activation)
router.post('/login', clientLogin);

export default router;
