import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/clients/:clientId/tasks
 * Get all tasks for a client (ClientProjectTask - tasks without quote)
 */
export const getClientTasks = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const tasks = await prisma.clientProjectTask.findMany({
      where: { clientAccessId: parseInt(clientId) },
      orderBy: { order: 'asc' },
      include: {
        completedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalCount = tasks.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return res.json({
      success: true,
      data: {
        tasks,
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching client tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei task',
    });
  }
};

/**
 * PATCH /api/clients/:clientId/tasks/:taskId/toggle
 * Toggle task completion status
 */
export const toggleClientTaskCompletion = async (req: Request, res: Response) => {
  try {
    const { clientId, taskId } = req.params;
    const userId = (req as any).user?.userId;

    const task = await prisma.clientProjectTask.findFirst({
      where: {
        id: parseInt(taskId),
        clientAccessId: parseInt(clientId),
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    const updatedTask = await prisma.clientProjectTask.update({
      where: { id: parseInt(taskId) },
      data: {
        isCompleted: !task.isCompleted,
        completedAt: !task.isCompleted ? new Date() : null,
        completedBy: !task.isCompleted ? userId : null,
      },
      include: {
        completedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error: any) {
    console.error('Error toggling client task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del task',
    });
  }
};

/**
 * POST /api/clients/:clientId/tasks
 * Create a new task for a client
 */
export const createClientTask = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Il titolo è obbligatorio',
      });
    }

    // Verify client exists
    const client = await prisma.clientAccess.findUnique({
      where: { id: parseInt(clientId) },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato',
      });
    }

    // Get the max order for this client
    const maxOrderTask = await prisma.clientProjectTask.findFirst({
      where: { clientAccessId: parseInt(clientId) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await prisma.clientProjectTask.create({
      data: {
        clientAccessId: parseInt(clientId),
        title,
        description,
        order: newOrder,
      },
    });

    return res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Error creating client task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nella creazione del task',
    });
  }
};

/**
 * PUT /api/clients/:clientId/tasks/:taskId
 * Update a client task
 */
export const updateClientTask = async (req: Request, res: Response) => {
  try {
    const { clientId, taskId } = req.params;
    const { title, description } = req.body;

    const task = await prisma.clientProjectTask.findFirst({
      where: {
        id: parseInt(taskId),
        clientAccessId: parseInt(clientId),
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    const updatedTask = await prisma.clientProjectTask.update({
      where: { id: parseInt(taskId) },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    });

    return res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error: any) {
    console.error('Error updating client task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del task',
    });
  }
};

/**
 * DELETE /api/clients/:clientId/tasks/:taskId
 * Delete a client task
 */
export const deleteClientTask = async (req: Request, res: Response) => {
  try {
    const { clientId, taskId } = req.params;

    const task = await prisma.clientProjectTask.findFirst({
      where: {
        id: parseInt(taskId),
        clientAccessId: parseInt(clientId),
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    await prisma.clientProjectTask.delete({
      where: { id: parseInt(taskId) },
    });

    return res.json({
      success: true,
      message: 'Task eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting client task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del task',
    });
  }
};
