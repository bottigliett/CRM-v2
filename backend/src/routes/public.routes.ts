import express from 'express';
import {
  verifyUsername,
  verifyActivationCode,
  completeManualActivation,
} from '../controllers/client-auth.controller';

const router = express.Router();

/**
 * PUBLIC ROUTES - NO AUTHENTICATION REQUIRED
 * Workaround for 401 issue on /client-auth routes
 */

// Step 1: Verify username exists
router.post('/verify-username', verifyUsername);

// Step 2: Verify activation code
router.post('/verify-activation-code', verifyActivationCode);

// Step 3: Complete manual activation
router.post('/complete-manual-activation', completeManualActivation);

export default router;
