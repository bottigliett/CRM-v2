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

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Case-insensitive substring match to handle old uppercase DB values
    // e.g. "TECNOCASA ESTESO", "^TECNOCASA ESTESO^", or ["TECNOCASA ESTESO"]
    const TECNOCASA_FILTER = { contains: 'Tecnocasa esteso' };

    const [
      organizationsTotal,
      organizationsMonth,
      ticketsTotal,
      ticketsOpen,
      ticketsMonth,
      ticketsWeek,
      contractsActiveTecnocasa,
      contractsBlockedTecnocasa,
      quotesTotal,
      quotesMonth,
      quotesCreato,
      ordersDaFatturare,
      ordersTotal,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.helpDeskTicket.count(),
      prisma.helpDeskTicket.count({ where: { status: 'Aperto' } }),
      prisma.helpDeskTicket.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.helpDeskTicket.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.serviceContract.count({ where: { status: 'Attivo', contractType: TECNOCASA_FILTER } }),
      prisma.serviceContract.count({ where: { status: 'Blocco Amministrativo', contractType: TECNOCASA_FILTER } }),
      prisma.vtQuote.count(),
      prisma.vtQuote.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.vtQuote.count({ where: { stage: 'Creato' } }),
      prisma.salesOrder.count({ where: { invoiceStatus: 'Da Fatturare' } }),
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

    // Events this week for "Agenda settimanale"
    const weekEventsRaw = await prisma.event.findMany({
      where: { startDateTime: { gte: startOfWeek, lt: endOfWeek } },
      orderBy: { startDateTime: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        startDateTime: true,
        endDateTime: true,
        isAllDay: true,
        color: true,
        assignedUser: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
    });

    const weekEvents = weekEventsRaw.map(e => ({
      id: e.id,
      title: e.title,
      startDate: e.startDateTime.toISOString(),
      endDate: e.endDateTime ? e.endDateTime.toISOString() : null,
      allDay: e.isAllDay,
      color: e.color,
      assignedTo: e.assignedUser,
    }));

    // Preventivi in stato CREATO (newest first)
    const quotesCreatiList = await prisma.vtQuote.findMany({
      where: { stage: 'Creato' },
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quoteNumber: true,
        subject: true,
        stage: true,
        validUntil: true,
        createdAt: true,
        organization: { select: { id: true, name: true, denomination: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, username: true } },
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
          activeTecnocasa: contractsActiveTecnocasa,
          blockedTecnocasa: contractsBlockedTecnocasa,
        },
        quotes: { total: quotesTotal, thisMonth: quotesMonth, creato: quotesCreato },
        orders: { total: ordersTotal, daFatturare: ordersDaFatturare },
        topOrgs,
        weekEvents,
        quotesCreatiList,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero delle statistiche', error: error.message });
  }
};
