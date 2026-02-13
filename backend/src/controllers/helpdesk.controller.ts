import { Request, Response } from 'express';
import prisma from '../config/database';

// Generate ticket number
const generateTicketNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `HD${year}-`;

  const lastTicket = await prisma.helpDeskTicket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: 'desc' },
  });

  let nextNum = 1;
  if (lastTicket) {
    const match = lastTicket.ticketNumber.match(/HD\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// Get all helpdesk tickets
export const getHelpDeskTickets = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      status = '',
      priority = '',
      callType = '',
      ticketOrigin = '',
      category = '',
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
        { technicianName: { contains: search } },
      ];
    }

    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (callType) where.callType = callType as string;
    if (ticketOrigin) where.ticketOrigin = ticketOrigin as string;
    if (category) where.category = category as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.helpDeskTicket.count({ where });

    const tickets = await prisma.helpDeskTicket.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching helpdesk tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei ticket',
      error: error.message,
    });
  }
};

// Get single ticket
export const getHelpDeskTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.helpDeskTicket.findUnique({
      where: { id: parseInt(id) },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket non trovato' });
    }

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    console.error('Error fetching helpdesk ticket:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero del ticket', error: error.message });
  }
};

// Create ticket
export const createHelpDeskTicket = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.title) {
      return res.status(400).json({ success: false, message: 'Il titolo è obbligatorio' });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await prisma.helpDeskTicket.create({
      data: {
        ticketNumber,
        title: data.title,
        status: data.status || 'Aperto',
        priority: data.priority || null,
        callType: data.callType || null,
        ticketOrigin: data.ticketOrigin || null,
        category: data.category || null,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        contactId: data.contactId ? parseInt(data.contactId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        description: data.description || null,
        solution: data.solution || null,
        days: data.days ? parseFloat(data.days) : null,
        hours: data.hours ? parseFloat(data.hours) : null,
        keywords: data.keywords || null,
        technicianName: data.technicianName || null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Ticket creato con successo', data: ticket });
  } catch (error: any) {
    console.error('Error creating helpdesk ticket:', error);
    res.status(500).json({ success: false, message: 'Errore nella creazione del ticket', error: error.message });
  }
};

// Update ticket
export const updateHelpDeskTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.helpDeskTicket.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ticket non trovato' });
    }

    const ticket = await prisma.helpDeskTicket.update({
      where: { id: parseInt(id) },
      data: {
        title: data.title,
        status: data.status,
        priority: data.priority,
        callType: data.callType,
        ticketOrigin: data.ticketOrigin,
        category: data.category,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        contactId: data.contactId ? parseInt(data.contactId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        description: data.description,
        solution: data.solution,
        days: data.days !== undefined && data.days !== null && data.days !== '' ? parseFloat(data.days) : null,
        hours: data.hours !== undefined && data.hours !== null && data.hours !== '' ? parseFloat(data.hours) : null,
        keywords: data.keywords,
        technicianName: data.technicianName,
      },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, message: 'Ticket aggiornato con successo', data: ticket });
  } catch (error: any) {
    console.error('Error updating helpdesk ticket:', error);
    res.status(500).json({ success: false, message: "Errore nell'aggiornamento del ticket", error: error.message });
  }
};

// Delete ticket
export const deleteHelpDeskTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.helpDeskTicket.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ticket non trovato' });
    }

    await prisma.helpDeskTicket.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Ticket eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting helpdesk ticket:', error);
    res.status(500).json({ success: false, message: "Errore nell'eliminazione del ticket", error: error.message });
  }
};
