import { Request, Response } from 'express';
import prisma from '../config/database';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      organizationsTotal,
      organizationsMonth,
      ticketsTotal,
      ticketsOpen,
      ticketsMonth,
      contractsActive,
      contractsValue,
      contractsMonth,
      quotesTotal,
      quotesMonth,
      ordersTotal,
      ordersMonth,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.helpDeskTicket.count(),
      prisma.helpDeskTicket.count({ where: { status: 'Aperto' } }),
      prisma.helpDeskTicket.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.serviceContract.count({ where: { status: 'Attivo' } }),
      prisma.serviceContract.aggregate({ _sum: { contractValue: true }, where: { status: 'Attivo' } }),
      prisma.serviceContract.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.vtQuote.count(),
      prisma.vtQuote.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.salesOrder.count(),
      prisma.salesOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    res.json({
      success: true,
      data: {
        organizations: {
          total: organizationsTotal,
          thisMonth: organizationsMonth,
        },
        tickets: {
          total: ticketsTotal,
          open: ticketsOpen,
          thisMonth: ticketsMonth,
        },
        contracts: {
          active: contractsActive,
          totalValue: contractsValue._sum.contractValue || 0,
          thisMonth: contractsMonth,
        },
        quotes: {
          total: quotesTotal,
          thisMonth: quotesMonth,
        },
        orders: {
          total: ordersTotal,
          thisMonth: ordersMonth,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle statistiche',
      error: error.message,
    });
  }
};
