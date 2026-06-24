import { Request, Response } from 'express';
import prisma from '../config/database';

export const getNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notes = await prisma.organizationNote.findMany({
      where: { organizationId: parseInt(id) },
      include: { user: { select: { id: true, firstName: true, lastName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: notes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user?.userId;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Il contenuto è obbligatorio' });
    }

    const note = await prisma.organizationNote.create({
      data: { organizationId: parseInt(id), userId: userId || null, content: content.trim() },
      include: { user: { select: { id: true, firstName: true, lastName: true, username: true } } },
    });
    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = (req as any).user?.userId;

    const note = await prisma.organizationNote.findUnique({ where: { id: parseInt(noteId) } });
    if (!note) return res.status(404).json({ success: false, message: 'Nota non trovata' });

    if (note.userId && note.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorizzato' });
    }

    await prisma.organizationNote.delete({ where: { id: parseInt(noteId) } });
    res.json({ success: true, message: 'Nota eliminata' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
