import { Request, Response } from 'express';
import prisma from '../config/database';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Monday of current week
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      organizationsTotal,
      organizationsMonth,
      ticketsTotal,
      ticketsOpen,
      ticketsMonth,
      ticketsWeek,
      contractsActive,
      contractsValue,
      quotesTotal,
      quotesMonth,
      ordersTotal,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.helpDeskTicket.count(),
      prisma.helpDeskTicket.count({ where: { status: 'Aperto' } }),
      prisma.helpDeskTicket.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.helpDeskTicket.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.serviceContract.count({ where: { status: 'Attivo' } }),
      prisma.serviceContract.aggregate({ _sum: { contractValue: true }, where: { status: 'Attivo' } }),
      prisma.vtQuote.count(),
      prisma.vtQuote.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.salesOrder.count(),
    ]);

    // Most active orgs: ticket count in last 30 days
    const ticketsByOrg = await prisma.helpDeskTicket.groupBy({
      by: ['organizationId'],
      where: { createdAt: { gte: thirtyDaysAgo }, organizationId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });

    const topOrgIds = ticketsByOrg.map(r => r.organizationId!).filter(Boolean);
    const topOrgsData = topOrgIds.length > 0
      ? await prisma.organization.findMany({
          where: { id: { in: topOrgIds } },
          select: { id: true, name: true, denomination: true, code: true },
        })
      : [];

    const orgMap: Record<number, { name: string; code: string | null }> = {};
    for (const o of topOrgsData) orgMap[o.id] = { name: o.denomination || o.name, code: o.code };

    const topOrgs = ticketsByOrg.map(r => ({
      orgId: r.organizationId!,
      orgName: orgMap[r.organizationId!]?.name || 'Sconosciuta',
      orgCode: orgMap[r.organizationId!]?.code || null,
      count: r._count.id,
    }));

    // Ticket status breakdown
    const ticketsByStatus = await prisma.helpDeskTicket.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Recent tickets (last 8, newest first)
    const recentTickets = await prisma.helpDeskTicket.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        technicianName: true,
        organization: { select: { id: true, name: true, denomination: true } },
      },
    });

    res.json({
      success: true,
      data: {
        organizations: { total: organizationsTotal, thisMonth: organizationsMonth },
        tickets: {
          total: ticketsTotal,
          open: ticketsOpen,
          thisMonth: ticketsMonth,
          thisWeek: ticketsWeek,
          byStatus: ticketsByStatus.map(s => ({ status: s.status || 'N/D', count: s._count.id })),
        },
        contracts: {
          active: contractsActive,
          totalValue: contractsValue._sum.contractValue || 0,
        },
        quotes: { total: quotesTotal, thisMonth: quotesMonth },
        orders: { total: ordersTotal },
        topOrgs,
        recentTickets,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero delle statistiche', error: error.message });
  }
};
