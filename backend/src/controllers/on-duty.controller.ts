import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Interface for authenticated request
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

// ===================================
// DAILY TODOS
// ===================================

export const getDailyTodos = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    // Set to start of day
    targetDate.setHours(0, 0, 0, 0);

    const todos = await prisma.dailyTodo.findMany({
      where: {
        userId: req.user.userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    console.error("Errore durante il recupero daily todos:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante il recupero dei todo giornalieri",
    });
  }
};

export const createDailyTodo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { text, date } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Il testo è obbligatorio',
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get max order for this user and date
    const maxOrder = await prisma.dailyTodo.aggregate({
      where: {
        userId: req.user.userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      _max: { order: true },
    });

    const todo = await prisma.dailyTodo.create({
      data: {
        userId: req.user.userId,
        text,
        date: targetDate,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.json({
      success: true,
      message: 'Todo giornaliero creato con successo',
      data: todo,
    });
  } catch (error) {
    console.error("Errore durante la creazione daily todo:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante la creazione del todo giornaliero",
    });
  }
};

export const updateDailyTodo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;
    const { text, completed } = req.body;

    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    const todo = await prisma.dailyTodo.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId, // Ensure user owns this todo
      },
      data: updateData,
    });

    if (todo.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo non trovato',
      });
    }

    const updated = await prisma.dailyTodo.findUnique({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Todo giornaliero aggiornato con successo',
      data: updated,
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento daily todo:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'aggiornamento del todo giornaliero",
    });
  }
};

export const deleteDailyTodo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;

    const deleted = await prisma.dailyTodo.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo non trovato',
      });
    }

    res.json({
      success: true,
      message: 'Todo giornaliero eliminato con successo',
    });
  } catch (error) {
    console.error("Errore durante l'eliminazione daily todo:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'eliminazione del todo giornaliero",
    });
  }
};

export const resetDailyTodos = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    await prisma.dailyTodo.updateMany({
      where: {
        userId: req.user.userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    const todos = await prisma.dailyTodo.findMany({
      where: {
        userId: req.user.userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      message: 'Todo giornalieri resettati con successo',
      data: todos,
    });
  } catch (error) {
    console.error("Errore durante il reset daily todos:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante il reset dei todo giornalieri",
    });
  }
};

// ===================================
// WEEKLY TODOS
// ===================================

// Helper function to get Monday of the week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export const getWeeklyTodos = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const weekStart = getMonday(targetDate);

    const todos = await prisma.weeklyTodo.findMany({
      where: {
        userId: req.user.userId,
        weekStart,
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    console.error("Errore durante il recupero weekly todos:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante il recupero dei todo settimanali",
    });
  }
};

export const createWeeklyTodo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { text, date } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Il testo è obbligatorio',
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    const weekStart = getMonday(targetDate);

    // Get max order for this user and week
    const maxOrder = await prisma.weeklyTodo.aggregate({
      where: {
        userId: req.user.userId,
        weekStart,
      },
      _max: { order: true },
    });

    const todo = await prisma.weeklyTodo.create({
      data: {
        userId: req.user.userId,
        text,
        weekStart,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.json({
      success: true,
      message: 'Todo settimanale creato con successo',
      data: todo,
    });
  } catch (error) {
    console.error("Errore durante la creazione weekly todo:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante la creazione del todo settimanale",
    });
  }
};

export const updateWeeklyTodo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;
    const { text, completed } = req.body;

    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    const todo = await prisma.weeklyTodo.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
      data: updateData,
    });

    if (todo.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo non trovato',
      });
    }

    const updated = await prisma.weeklyTodo.findUnique({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Todo settimanale aggiornato con successo',
      data: updated,
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento weekly todo:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'aggiornamento del todo settimanale",
    });
  }
};

export const deleteWeeklyTodo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;

    const deleted = await prisma.weeklyTodo.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo non trovato',
      });
    }

    res.json({
      success: true,
      message: 'Todo settimanale eliminato con successo',
    });
  } catch (error) {
    console.error("Errore durante l'eliminazione weekly todo:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'eliminazione del todo settimanale",
    });
  }
};

export const resetWeeklyTodos = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const weekStart = getMonday(targetDate);

    await prisma.weeklyTodo.updateMany({
      where: {
        userId: req.user.userId,
        weekStart,
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    const todos = await prisma.weeklyTodo.findMany({
      where: {
        userId: req.user.userId,
        weekStart,
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      message: 'Todo settimanali resettati con successo',
      data: todos,
    });
  } catch (error) {
    console.error("Errore durante il reset weekly todos:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante il reset dei todo settimanali",
    });
  }
};

// ===================================
// TASK PHASES
// ===================================

export const getTaskPhases = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { taskId } = req.params;

    const phases = await prisma.taskPhase.findMany({
      where: {
        taskId: parseInt(taskId),
        userId: req.user.userId,
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: phases,
    });
  } catch (error) {
    console.error("Errore durante il recupero task phases:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante il recupero delle fasi del task",
    });
  }
};

export const createTaskPhase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { taskId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Il testo è obbligatorio',
      });
    }

    // Get max order for this task
    const maxOrder = await prisma.taskPhase.aggregate({
      where: {
        taskId: parseInt(taskId),
        userId: req.user.userId,
      },
      _max: { order: true },
    });

    const phase = await prisma.taskPhase.create({
      data: {
        taskId: parseInt(taskId),
        userId: req.user.userId,
        text,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.json({
      success: true,
      message: 'Fase creata con successo',
      data: phase,
    });
  } catch (error) {
    console.error("Errore durante la creazione task phase:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante la creazione della fase",
    });
  }
};

export const updateTaskPhase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;
    const { text, completed } = req.body;

    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    const phase = await prisma.taskPhase.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
      data: updateData,
    });

    if (phase.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fase non trovata',
      });
    }

    const updated = await prisma.taskPhase.findUnique({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Fase aggiornata con successo',
      data: updated,
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento task phase:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'aggiornamento della fase",
    });
  }
};

export const deleteTaskPhase = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;

    const deleted = await prisma.taskPhase.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fase non trovata',
      });
    }

    res.json({
      success: true,
      message: 'Fase eliminata con successo',
    });
  } catch (error) {
    console.error("Errore durante l'eliminazione task phase:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'eliminazione della fase",
    });
  }
};
