import express from 'express';
import {
  getClientNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
  getAllNotifications,
} from '../controllers/client-notification.controller';
import { authenticate } from '../middleware/auth';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

/**
 * CLIENT ROUTES - Gestione notifiche proprie
 * Base path: /api/client/notifications
 */
export const clientNotificationRouter = express.Router();
clientNotificationRouter.get('/', authenticateClient, getClientNotifications);
clientNotificationRouter.get('/unread-count', authenticateClient, getUnreadCount);
clientNotificationRouter.put('/:id/read', authenticateClient, markAsRead);
clientNotificationRouter.put('/read-all', authenticateClient, markAllAsRead);
clientNotificationRouter.delete('/:id', authenticateClient, deleteNotification);

/**
 * ADMIN ROUTES - Gestione notifiche globale
 * Base path: /api/admin/notifications
 */
router.get('/', authenticate, getAllNotifications);
router.post('/send', authenticate, sendNotification);

export default router;
