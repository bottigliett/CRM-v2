import express from 'express';
import { getClientTasks, getClientTaskById } from '../controllers/client-task.controller';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

// All routes require client authentication
router.get('/', authenticateClient, getClientTasks);
router.get('/:id', authenticateClient, getClientTaskById);

export default router;
