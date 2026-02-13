import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getQuoteTasks,
  toggleTaskCompletion,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/project-task.controller';

const router = Router();

// All routes require authentication
router.get('/quotes/:quoteId/tasks', authenticate, getQuoteTasks);
router.post('/quotes/:quoteId/tasks', authenticate, createTask);
router.patch('/quotes/:quoteId/tasks/:taskId/toggle', authenticate, toggleTaskCompletion);
router.put('/quotes/:quoteId/tasks/:taskId', authenticate, updateTask);
router.delete('/quotes/:quoteId/tasks/:taskId', authenticate, deleteTask);

export default router;
