import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/quotes/:quoteId/tasks
 * Get all tasks for a quote
 */
export const getQuoteTasks = async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.params;

    const tasks = await prisma.projectTask.findMany({
      where: { quoteId: parseInt(quoteId) },
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

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei task',
    });
  }
};

/**
 * PATCH /api/quotes/:quoteId/tasks/:taskId/toggle
 * Toggle task completion status
 */
export const toggleTaskCompletion = async (req: Request, res: Response) => {
  try {
    const { quoteId, taskId } = req.params;
    const userId = (req as any).user?.userId;

    const task = await prisma.projectTask.findFirst({
      where: {
        id: parseInt(taskId),
        quoteId: parseInt(quoteId),
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    const updatedTask = await prisma.projectTask.update({
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
    console.error('Error toggling task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del task',
    });
  }
};

/**
 * POST /api/quotes/:quoteId/tasks
 * Create a new task manually
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Il titolo è obbligatorio',
      });
    }

    // Get the max order for this quote
    const maxOrderTask = await prisma.projectTask.findFirst({
      where: { quoteId: parseInt(quoteId) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await prisma.projectTask.create({
      data: {
        quoteId: parseInt(quoteId),
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
    console.error('Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nella creazione del task',
    });
  }
};

/**
 * PUT /api/quotes/:quoteId/tasks/:taskId
 * Update a task
 */
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { quoteId, taskId } = req.params;
    const { title, description } = req.body;

    const task = await prisma.projectTask.findFirst({
      where: {
        id: parseInt(taskId),
        quoteId: parseInt(quoteId),
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    const updatedTask = await prisma.projectTask.update({
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
    console.error('Error updating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del task',
    });
  }
};

/**
 * DELETE /api/quotes/:quoteId/tasks/:taskId
 * Delete a task
 */
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { quoteId, taskId } = req.params;

    const task = await prisma.projectTask.findFirst({
      where: {
        id: parseInt(taskId),
        quoteId: parseInt(quoteId),
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    await prisma.projectTask.delete({
      where: { id: parseInt(taskId) },
    });

    return res.json({
      success: true,
      message: 'Task eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del task',
    });
  }
};
