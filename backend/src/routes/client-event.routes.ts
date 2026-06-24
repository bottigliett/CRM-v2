import express from 'express';
import { getClientEvents, getClientEventById } from '../controllers/client-event.controller';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

// All routes require client authentication
router.get('/', authenticateClient, getClientEvents);
router.get('/:id', authenticateClient, getClientEventById);

export default router;
