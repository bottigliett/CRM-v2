import { Router } from 'express';
import { authenticateClient } from '../middleware/client-auth';
import { getClientProjectTasks } from '../controllers/client-project-task.controller';

const router = Router();

// Get client project tasks
router.get('/', authenticateClient, getClientProjectTasks);

export default router;
