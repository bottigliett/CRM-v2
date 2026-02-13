import { Request, Response } from 'express';
import prisma from '../config/database';

// Generate quote number
const generateQuoteNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `P${year}-`;

  const last = await prisma.vtQuote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: 'desc' },
  });

  let nextNum = 1;
  if (last) {
    const match = last.quoteNumber.match(/P\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// Get all quotes
export const getVtQuotes = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      stage = '',
      organizationId = '',
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    if (stage) where.stage = stage as string;
    if (organizationId) where.organizationId = parseInt(organizationId as string);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.vtQuote.count({ where });

    const quotes = await prisma.vtQuote.findMany({
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
        quotes,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching vt-quotes:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero dei preventivi', error: error.message });
  }
};

// Get single quote
export const getVtQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.vtQuote.findUnique({
      where: { id: parseInt(id) },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
        salesOrders: { select: { id: true, orderNumber: true, subject: true, status: true } },
      },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Preventivo non trovato' });
    }

    res.json({ success: true, data: quote });
  } catch (error: any) {
    console.error('Error fetching vt-quote:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero del preventivo', error: error.message });
  }
};

// Create quote
export const createVtQuote = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.subject) {
      return res.status(400).json({ success: false, message: "L'oggetto è obbligatorio" });
    }

    const quoteNumber = await generateQuoteNumber();

    const quote = await prisma.vtQuote.create({
      data: {
        quoteNumber,
        subject: data.subject,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        contactId: data.contactId ? parseInt(data.contactId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        stage: data.stage || 'Creato',
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        billStreet: data.billStreet || null,
        billPoBox: data.billPoBox || null,
        billCity: data.billCity || null,
        billState: data.billState || null,
        billCode: data.billCode || null,
        billCountry: data.billCountry || null,
        shipStreet: data.shipStreet || null,
        shipPoBox: data.shipPoBox || null,
        shipCity: data.shipCity || null,
        shipState: data.shipState || null,
        shipCode: data.shipCode || null,
        shipCountry: data.shipCountry || null,
        termsConditions: data.termsConditions || null,
        description: data.description || null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Preventivo creato con successo', data: quote });
  } catch (error: any) {
    console.error('Error creating vt-quote:', error);
    res.status(500).json({ success: false, message: 'Errore nella creazione del preventivo', error: error.message });
  }
};

// Update quote
export const updateVtQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.vtQuote.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Preventivo non trovato' });
    }

    const quote = await prisma.vtQuote.update({
      where: { id: parseInt(id) },
      data: {
        subject: data.subject,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        contactId: data.contactId ? parseInt(data.contactId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        stage: data.stage,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        billStreet: data.billStreet,
        billPoBox: data.billPoBox,
        billCity: data.billCity,
        billState: data.billState,
        billCode: data.billCode,
        billCountry: data.billCountry,
        shipStreet: data.shipStreet,
        shipPoBox: data.shipPoBox,
        shipCity: data.shipCity,
        shipState: data.shipState,
        shipCode: data.shipCode,
        shipCountry: data.shipCountry,
        termsConditions: data.termsConditions,
        description: data.description,
      },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, message: 'Preventivo aggiornato con successo', data: quote });
  } catch (error: any) {
    console.error('Error updating vt-quote:', error);
    res.status(500).json({ success: false, message: "Errore nell'aggiornamento del preventivo", error: error.message });
  }
};

// Delete quote
export const deleteVtQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.vtQuote.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Preventivo non trovato' });
    }

    await prisma.vtQuote.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Preventivo eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting vt-quote:', error);
    res.status(500).json({ success: false, message: "Errore nell'eliminazione del preventivo", error: error.message });
  }
};
