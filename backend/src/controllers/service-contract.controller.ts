import { Request, Response } from 'express';
import prisma from '../config/database';

// Generate contract number
const generateContractNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `SC${year}-`;

  const last = await prisma.serviceContract.findFirst({
    where: { contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: 'desc' },
  });

  let nextNum = 1;
  if (last) {
    const match = last.contractNumber.match(/SC\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// Get all service contracts
export const getServiceContracts = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      status = '',
      frequency = '',
      isConsultecno = '',
      isPaid = '',
      page = '1',
      limit = '20',
      includeStats = 'false',
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { contractNumber: { contains: search } },
        { subject: { contains: search } },
        { invoiceRef: { contains: search } },
      ];
    }

    if (status) where.status = status as string;
    if (frequency) where.frequency = frequency as string;
    if (isConsultecno !== '') where.isConsultecno = isConsultecno === 'true';
    if (isPaid !== '') where.isPaid = isPaid === 'true';

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.serviceContract.count({ where });

    const contracts = await prisma.serviceContract.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    let statistics = null;
    if (includeStats === 'true') {
      const activeContracts = await prisma.serviceContract.count({ where: { status: 'Attivo' } });
      const allActive = await prisma.serviceContract.findMany({ where: { status: 'Attivo' } });
      const totalValue = allActive.reduce((sum, c) => sum + (c.contractValue || 0), 0);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringSoon = await prisma.serviceContract.count({
        where: {
          status: 'Attivo',
          dueDate: { lte: thirtyDaysFromNow, gte: new Date() },
        },
      });

      statistics = { activeContracts, totalValue, expiringSoon };
    }

    res.json({
      success: true,
      data: {
        contracts,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
        statistics,
      },
    });
  } catch (error: any) {
    console.error('Error fetching service contracts:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero dei contratti', error: error.message });
  }
};

// Get single contract
export const getServiceContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contract = await prisma.serviceContract.findUnique({
      where: { id: parseInt(id) },
      include: {
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contratto non trovato' });
    }

    res.json({ success: true, data: contract });
  } catch (error: any) {
    console.error('Error fetching service contract:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero del contratto', error: error.message });
  }
};

// Create contract
export const createServiceContract = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const contractNumber = await generateContractNumber();

    const contract = await prisma.serviceContract.create({
      data: {
        contractNumber,
        subject: data.subject || null,
        contractType: data.contractType || null,
        status: data.status || 'Attivo',
        frequency: data.frequency || null,
        contractValue: data.contractValue ? parseFloat(data.contractValue) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        nextInvoiceDate: data.nextInvoiceDate ? new Date(data.nextInvoiceDate) : null,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        isConsultecno: data.isConsultecno || false,
        isPaid: data.isPaid || false,
        invoiceRef: data.invoiceRef || null,
        trackingUnit: data.trackingUnit || null,
        totalUnits: data.totalUnits ? parseFloat(data.totalUnits) : null,
        usedUnits: data.usedUnits ? parseFloat(data.usedUnits) : 0,
        priority: data.priority || null,
        description: data.description || null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Contratto creato con successo', data: contract });
  } catch (error: any) {
    console.error('Error creating service contract:', error);
    res.status(500).json({ success: false, message: 'Errore nella creazione del contratto', error: error.message });
  }
};

// Update contract
export const updateServiceContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.serviceContract.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contratto non trovato' });
    }

    const contract = await prisma.serviceContract.update({
      where: { id: parseInt(id) },
      data: {
        subject: data.subject,
        contractType: data.contractType,
        status: data.status,
        frequency: data.frequency,
        contractValue: data.contractValue !== undefined && data.contractValue !== null && data.contractValue !== '' ? parseFloat(data.contractValue) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        nextInvoiceDate: data.nextInvoiceDate ? new Date(data.nextInvoiceDate) : null,
        organizationId: data.organizationId ? parseInt(data.organizationId) : null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        isConsultecno: data.isConsultecno,
        isPaid: data.isPaid,
        invoiceRef: data.invoiceRef,
        trackingUnit: data.trackingUnit,
        totalUnits: data.totalUnits !== undefined && data.totalUnits !== null && data.totalUnits !== '' ? parseFloat(data.totalUnits) : null,
        usedUnits: data.usedUnits !== undefined && data.usedUnits !== null && data.usedUnits !== '' ? parseFloat(data.usedUnits) : 0,
        priority: data.priority,
        description: data.description,
      },
      include: {
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, message: 'Contratto aggiornato con successo', data: contract });
  } catch (error: any) {
    console.error('Error updating service contract:', error);
    res.status(500).json({ success: false, message: "Errore nell'aggiornamento del contratto", error: error.message });
  }
};

// Delete contract
export const deleteServiceContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.serviceContract.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contratto non trovato' });
    }

    await prisma.serviceContract.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Contratto eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting service contract:', error);
    res.status(500).json({ success: false, message: "Errore nell'eliminazione del contratto", error: error.message });
  }
};
