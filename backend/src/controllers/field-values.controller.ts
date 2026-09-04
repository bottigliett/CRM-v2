import { Request, Response } from 'express';
import prisma from '../config/database';

// Table → allowed columns mapping (whitelist to prevent SQL injection)
const ALLOWED_FIELDS: Record<string, string[]> = {
  help_desk_tickets: ['status', 'call_type', 'ticket_origin', 'category', 'priority'],
  vt_quotes: ['stage'],
  sales_orders: ['status', 'invoice_status'],
  service_contracts: ['status', 'contract_type'],
};

// Column name → DB column mapping (camelCase → snake_case)
const COLUMN_MAP: Record<string, string> = {
  callType: 'call_type',
  ticketOrigin: 'ticket_origin',
  invoiceStatus: 'invoice_status',
  contractType: 'contract_type',
};

// Table name → Prisma model mapping for updateMany
const TABLE_MODEL: Record<string, string> = {
  help_desk_tickets: 'helpDeskTicket',
  vt_quotes: 'vtQuote',
  sales_orders: 'salesOrder',
  service_contracts: 'serviceContract',
};

// Prisma field name mapping (snake_case → camelCase for Prisma)
const PRISMA_FIELD_MAP: Record<string, string> = {
  call_type: 'callType',
  ticket_origin: 'ticketOrigin',
  invoice_status: 'invoiceStatus',
  contract_type: 'contractType',
};

export const getFieldValues = async (req: Request, res: Response) => {
  try {
    const { table, field } = req.params;
    const dbColumn = COLUMN_MAP[field] || field;

    const allowedCols = ALLOWED_FIELDS[table];
    if (!allowedCols || !allowedCols.includes(dbColumn)) {
      return res.status(400).json({ success: false, message: `Campo "${field}" non consentito per "${table}"` });
    }

    // Use raw query with known-safe column names (whitelisted above)
    const results = await prisma.$queryRawUnsafe<{ value: string; count: bigint }[]>(
      `SELECT \`${dbColumn}\` as value, COUNT(*) as count FROM \`${table}\` WHERE \`${dbColumn}\` IS NOT NULL AND \`${dbColumn}\` != '' GROUP BY \`${dbColumn}\` ORDER BY count DESC`
    );

    res.json({
      success: true,
      data: results.map(r => ({ name: r.value, count: Number(r.count) })),
    });
  } catch (error: any) {
    console.error('Error fetching field values:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero dei valori', error: error.message });
  }
};

export const renameFieldValue = async (req: Request, res: Response) => {
  try {
    const { table, field } = req.params;
    const { oldName, newName } = req.body;
    const dbColumn = COLUMN_MAP[field] || field;

    const allowedCols = ALLOWED_FIELDS[table];
    if (!allowedCols || !allowedCols.includes(dbColumn)) {
      return res.status(400).json({ success: false, message: `Campo "${field}" non consentito per "${table}"` });
    }
    if (!oldName || !newName) {
      return res.status(400).json({ success: false, message: 'oldName e newName sono obbligatori' });
    }

    const modelName = TABLE_MODEL[table];
    const prismaField = PRISMA_FIELD_MAP[dbColumn] || dbColumn;

    const result = await (prisma as any)[modelName].updateMany({
      where: { [prismaField]: oldName },
      data: { [prismaField]: newName },
    });

    res.json({ success: true, message: `${result.count} record aggiornati`, data: { updated: result.count } });
  } catch (error: any) {
    console.error('Error renaming field value:', error);
    res.status(500).json({ success: false, message: 'Errore nella rinomina', error: error.message });
  }
};
