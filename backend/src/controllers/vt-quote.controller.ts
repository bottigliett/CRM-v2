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

// Generate order number for auto-creation
const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `OV${year}-`;

  const last = await prisma.salesOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });

  let nextNum = 1;
  if (last) {
    const match = last.orderNumber.match(/OV\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

const quoteInclude = {
  organization: { select: { id: true, name: true, denomination: true, vatNumber: true, billStreet: true, billCity: true, billState: true, billCode: true, billCountry: true } },
  contact: { select: { id: true, name: true, email: true, phone: true } },
  assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
  items: {
    include: {
      product: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' as const },
  },
  salesOrders: { select: { id: true, orderNumber: true, subject: true, status: true } },
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
      quoteNumber = '',
      subject = '',
      orgName = '',
      assignedTo = '',
      validUntilFrom = '',
      validUntilTo = '',
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

    // Column-level filters
    if (quoteNumber) where.quoteNumber = { contains: quoteNumber as string };
    if (subject) where.subject = { contains: subject as string };
    if (orgName) where.organization = { name: { contains: orgName as string } };
    if (assignedTo) {
      where.assignedTo = {
        OR: [
          { firstName: { contains: assignedTo as string } },
          { lastName: { contains: assignedTo as string } },
          { username: { contains: assignedTo as string } },
        ],
      };
    }
    if (validUntilFrom || validUntilTo) {
      where.validUntil = {};
      if (validUntilFrom) where.validUntil.gte = new Date(validUntilFrom as string);
      if (validUntilTo) { const end = new Date(validUntilTo as string); end.setHours(23, 59, 59, 999); where.validUntil.lte = end; }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.vtQuote.count({ where });

    const quotes = await prisma.vtQuote.findMany({
      where,
      include: quoteInclude,
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
      include: quoteInclude,
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
        items: data.items && data.items.length > 0 ? {
          create: data.items.map((item: any) => ({
            productId: item.productId ? parseInt(item.productId) : null,
            itemName: item.itemName,
            description: item.description || null,
            icon: item.icon || null,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            discount: parseFloat(item.discount) || 0,
            total: parseFloat(item.total) || 0,
          })),
        } : undefined,
      },
      include: quoteInclude,
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
    const quoteId = parseInt(id);

    const existing = await prisma.vtQuote.findUnique({ where: { id: quoteId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Preventivo non trovato' });
    }

    // If items are provided, delete existing and recreate
    if (data.items !== undefined) {
      await prisma.vtQuoteItem.deleteMany({ where: { quoteId } });
    }

    const quote = await prisma.vtQuote.update({
      where: { id: quoteId },
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
        items: data.items && data.items.length > 0 ? {
          create: data.items.map((item: any) => ({
            productId: item.productId ? parseInt(item.productId) : null,
            itemName: item.itemName,
            description: item.description || null,
            icon: item.icon || null,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            discount: parseFloat(item.discount) || 0,
            total: parseFloat(item.total) || 0,
          })),
        } : undefined,
      },
      include: quoteInclude,
    });

    // FASE 3: Auto-create SalesOrder when stage changes to "Accettato"
    if (data.stage === 'Accettato' && existing.stage !== 'Accettato') {
      try {
        const orderNumber = await generateOrderNumber();
        await prisma.salesOrder.create({
          data: {
            orderNumber,
            subject: quote.subject,
            organizationId: quote.organizationId,
            contactId: quote.contactId,
            quoteId: quote.id,
            assignedToId: quote.assignedToId,
            status: 'Creato',
            invoiceStatus: 'Da Fatturare',
            billStreet: quote.billStreet,
            billPoBox: quote.billPoBox,
            billCity: quote.billCity,
            billState: quote.billState,
            billCode: quote.billCode,
            billCountry: quote.billCountry,
            shipStreet: quote.shipStreet,
            shipPoBox: quote.shipPoBox,
            shipCity: quote.shipCity,
            shipState: quote.shipState,
            shipCode: quote.shipCode,
            shipCountry: quote.shipCountry,
            termsConditions: quote.termsConditions,
            description: quote.description,
          },
        });
        console.log(`Auto-created SalesOrder ${orderNumber} from quote ${quote.quoteNumber}`);
      } catch (orderError: any) {
        console.error('Error auto-creating sales order:', orderError);
        // Don't fail the quote update if order creation fails
      }
    }

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

// Expire quotes older than 30 days (called by cron)
export const expireOldQuotes = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.vtQuote.updateMany({
      where: {
        stage: 'Creato',
        createdAt: { lt: thirtyDaysAgo },
      },
      data: { stage: 'Scaduto' },
    });

    if (result.count > 0) {
      console.log(`Expired ${result.count} quotes older than 30 days`);
    }

    return result.count;
  } catch (error) {
    console.error('Error expiring old quotes:', error);
    return 0;
  }
};
