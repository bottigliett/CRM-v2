import { Request, Response } from 'express';
import prisma from '../config/database';

// Generate order number
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

// Get all sales orders
export const getSalesOrders = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      status = '',
      invoiceStatus = '',
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { subject: { contains: search } },
        { customerNumber: { contains: search } },
      ];
    }

    if (status) where.status = status as string;
    if (invoiceStatus) where.invoiceStatus = invoiceStatus as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.salesOrder.count({ where });

    const orders = await prisma.salesOrder.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        quote: { select: { id: true, quoteNumber: true, subject: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero degli ordini', error: error.message });
  }
};

// Get single order
export const getSalesOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
        quote: { select: { id: true, quoteNumber: true, subject: true, stage: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Ordine non trovato' });
    }

    res.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ success: false, message: "Errore nel recupero dell'ordine", error: error.message });
  }
};

// Create order
export const createSalesOrder = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.subject) {
      return res.status(400).json({ success: false, message: "L'oggetto è obbligatorio" });
    }

    const orderNumber = await generateOrderNumber();

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        subject: data.subject,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        contactId: data.contactId ? parseInt(data.contactId) : null,
        quoteId: data.quoteId ? parseInt(data.quoteId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        customerNumber: data.customerNumber || null,
        purchaseOrder: data.purchaseOrder || null,
        invoiceStatus: data.invoiceStatus || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || 'Creato',
        salesCommission: data.salesCommission ? parseFloat(data.salesCommission) : null,
        carrier: data.carrier || null,
        exciseDuty: data.exciseDuty ? parseFloat(data.exciseDuty) : null,
        consultecnoContract: data.consultecnoContract || null,
        opening: data.opening || null,
        enableRecurring: data.enableRecurring || false,
        recurringFreq: data.recurringFreq || null,
        startPeriod: data.startPeriod ? new Date(data.startPeriod) : null,
        endPeriod: data.endPeriod ? new Date(data.endPeriod) : null,
        paymentDuration: data.paymentDuration || null,
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
        quote: { select: { id: true, quoteNumber: true, subject: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Ordine creato con successo', data: order });
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    res.status(500).json({ success: false, message: "Errore nella creazione dell'ordine", error: error.message });
  }
};

// Update order
export const updateSalesOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.salesOrder.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ordine non trovato' });
    }

    const order = await prisma.salesOrder.update({
      where: { id: parseInt(id) },
      data: {
        subject: data.subject,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        contactId: data.contactId ? parseInt(data.contactId) : null,
        quoteId: data.quoteId ? parseInt(data.quoteId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        customerNumber: data.customerNumber,
        purchaseOrder: data.purchaseOrder,
        invoiceStatus: data.invoiceStatus,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status,
        salesCommission: data.salesCommission !== undefined && data.salesCommission !== null && data.salesCommission !== '' ? parseFloat(data.salesCommission) : null,
        carrier: data.carrier,
        exciseDuty: data.exciseDuty !== undefined && data.exciseDuty !== null && data.exciseDuty !== '' ? parseFloat(data.exciseDuty) : null,
        consultecnoContract: data.consultecnoContract,
        opening: data.opening,
        enableRecurring: data.enableRecurring,
        recurringFreq: data.recurringFreq,
        startPeriod: data.startPeriod ? new Date(data.startPeriod) : null,
        endPeriod: data.endPeriod ? new Date(data.endPeriod) : null,
        paymentDuration: data.paymentDuration,
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
        quote: { select: { id: true, quoteNumber: true, subject: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, message: 'Ordine aggiornato con successo', data: order });
  } catch (error: any) {
    console.error('Error updating sales order:', error);
    res.status(500).json({ success: false, message: "Errore nell'aggiornamento dell'ordine", error: error.message });
  }
};

// Delete order
export const deleteSalesOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.salesOrder.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ordine non trovato' });
    }

    await prisma.salesOrder.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Ordine eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({ success: false, message: "Errore nell'eliminazione dell'ordine", error: error.message });
  }
};
