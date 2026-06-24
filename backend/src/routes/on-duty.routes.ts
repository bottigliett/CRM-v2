import { Router } from 'express';
import {
  // Daily todos
  getDailyTodos,
  createDailyTodo,
  updateDailyTodo,
  deleteDailyTodo,
  resetDailyTodos,
  // Weekly todos
  getWeeklyTodos,
  createWeeklyTodo,
  updateWeeklyTodo,
  deleteWeeklyTodo,
  resetWeeklyTodos,
  // Task phases
  getTaskPhases,
  createTaskPhase,
  updateTaskPhase,
  deleteTaskPhase,
} from '../controllers/on-duty.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Daily todos routes
router.get('/daily-todos', getDailyTodos);
router.post('/daily-todos', createDailyTodo);
router.put('/daily-todos/:id', updateDailyTodo);
router.delete('/daily-todos/:id', deleteDailyTodo);
router.post('/daily-todos/reset', resetDailyTodos);

// Weekly todos routes
router.get('/weekly-todos', getWeeklyTodos);
router.post('/weekly-todos', createWeeklyTodo);
router.put('/weekly-todos/:id', updateWeeklyTodo);
router.delete('/weekly-todos/:id', deleteWeeklyTodo);
router.post('/weekly-todos/reset', resetWeeklyTodos);

// Task phases routes
router.get('/task-phases/:taskId', getTaskPhases);
router.post('/task-phases/:taskId', createTaskPhase);
router.put('/task-phases/:id', updateTaskPhase);
router.delete('/task-phases/:id', deleteTaskPhase);

export default router;
