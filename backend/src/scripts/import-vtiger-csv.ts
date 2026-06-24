import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '../config/database';

// ─── Config ──────────────────────────────────────────────────────────
// Pass custom path as CLI argument, e.g.: npx ts-node src/scripts/import-vtiger-csv.ts /path/to/csv
const CSV_DIR = process.argv[2] || path.join(__dirname, '../../csv_import');

// ─── Utility functions ──────────────────────────────────────────────

function parseDate(str: string | undefined): Date | null {
  if (!str || str === '--' || str.trim() === '') return null;
  const match = str.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = match;
  return new Date(
    parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
    hh ? parseInt(hh) : 0, mi ? parseInt(mi) : 0, ss ? parseInt(ss) : 0
  );
}

function parseFloat8(str: string | undefined): number | null {
  if (!str || str.trim() === '' || str === '--') return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseBool(str: string | undefined): boolean {
  return str === '1';
}

function extractRef(str: string | undefined): string | null {
  if (!str || str.trim() === '') return null;
  const idx = str.indexOf('::::');
  if (idx !== -1) return str.substring(idx + 4).trim();
  return str.trim();
}

function trim(str: string | undefined): string | null {
  if (!str || str.trim() === '') return null;
  return str.trim();
}

function parseInt2(str: string | undefined): number | null {
  if (!str || str.trim() === '') return null;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(CSV_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  // VTiger exports contain backslash-escaped quotes (like \") inside fields,
  // which breaks standard CSV parsing. Replace \" with &quot; before parsing.
  const content = raw.replace(/\\"/g, '&quot;');
  // Deduplicate column names: append _2, _3, etc. for duplicate headers
  // (e.g. Ordini_di_vendita has "Stato fatturazione" twice and "Interno" twice)
  const records: Record<string, string>[] = parse(content, {
    columns: (header: string[]) => {
      const counts: Record<string, number> = {};
      return header.map(col => {
        const name = col.trim();
        counts[name] = (counts[name] || 0) + 1;
        return counts[name] > 1 ? `${name}_${counts[name]}` : name;
      });
    },
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  return records;
}

// ─── Lookup caches ──────────────────────────────────────────────────
let userCache: Map<string, number> = new Map();
let orgCache: Map<string, number> = new Map();

async function buildUserCache() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, firstName: true, lastName: true } });
  for (const u of users) {
    userCache.set(u.username.toLowerCase(), u.id);
    if (u.firstName) {
      userCache.set(u.firstName.toLowerCase(), u.id);
    }
  }
  console.log(`  User cache: ${userCache.size} entries`);
}

async function buildOrgCache() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  orgCache.clear();
  for (const o of orgs) {
    orgCache.set(o.name.toLowerCase(), o.id);
  }
  console.log(`  Org cache: ${orgCache.size} entries`);
}

function lookupUser(name: string | undefined): number | null {
  if (!name || name.trim() === '') return null;
  return userCache.get(name.trim().toLowerCase()) ?? null;
}

function lookupOrg(name: string | undefined): number | null {
  if (!name || name.trim() === '') return null;
  const clean = extractRef(name) ?? name.trim();
  return orgCache.get(clean.toLowerCase()) ?? null;
}

// ─── 1. Import Organizations ───────────────────────────────────────
async function importOrganizations() {
  console.log('\n═══ Importing Organizations ═══');
  const rows = readCsv('Organizzazioni.csv');
  console.log(`  Rows in CSV: ${rows.length}`);

  let imported = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const name = trim(row['Nome Organizzazione']);
    if (!name) { errors++; continue; }

    const existing = await prisma.organization.findFirst({ where: { name } });
    if (existing) { skipped++; continue; }

    try {
      await prisma.organization.create({
        data: {
          name,
          isActive: parseBool(row['Attivo']),
          phone: trim(row['Telefono']),
          otherPhone: trim(row['Altro telefono']),
          mobile: trim(row['Cellulare']),
          fax: trim(row['Fax']),
          email: trim(row['Email']),
          code: trim(row['Codice']),
          vatNumber: trim(row['P.Iva']),
          uniqueCode: trim(row['Codice Univoco']),
          denomination: trim(row['Denominazione']),
          pec: trim(row['PEC']),
          industry: trim(row['Settore']),
          accountType: trim(row['Tipo']),
          devices: trim(row['Dispositivi']),
          nasInfo: trim(row['NAS']),
          shareholders: trim(row['Compagine sociale']),
          nasContract: trim(row['Contratto NAS']),
          legalRep: trim(row['Legale rappresentante']),
          secretary: trim(row['Segretaria']),
          employees: parseInt2(row['Impiegati']),
          priceList: trim(row['Listino']),
          bankName: trim(row['Banca di appoggio']),
          iban: trim(row['IBAN']),
          description: trim(row['Descrizione']),
          billStreet: trim(row['Indirizzo di fatturazione']),
          billCity: trim(row['Citt\u00e0 fatturazione'] || row['Citt&agrave; fatturazione']),
          billState: trim(row['Provincia fatturazione']),
          billCode: trim(row['Cap fatturazione']),
          billCountry: trim(row['Stato fatturazione']),
          shipStreet: trim(row['Indirizzo di spedizione']),
          shipCity: trim(row['Citt\u00e0 di spedizione'] || row['Citt&agrave; di spedizione']),
          shipState: trim(row['Provincia di spedizione']),
          shipCode: trim(row['Cap spedizione']),
          shipCountry: trim(row['Stato di spedizione']),
          assignedToId: lookupUser(row['Assegnato a']),
          createdAt: parseDate(row['Orario creazione']) ?? undefined,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 5) console.error(`  Error on "${name}": ${err.message}`);
    }
  }

  console.log(`  Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors}`);

  // Second pass: resolve "Membro di" (parent organization)
  console.log('  Resolving parent organizations...');
  await buildOrgCache();
  let parentLinked = 0;
  for (const row of rows) {
    const name = trim(row['Nome Organizzazione']);
    const parentName = trim(row['Membro di']);
    if (!name || !parentName) continue;

    const orgId = orgCache.get(name.toLowerCase());
    const parentId = orgCache.get(parentName.toLowerCase());
    if (orgId && parentId && orgId !== parentId) {
      try {
        await prisma.organization.update({
          where: { id: orgId },
          data: { parentId },
        });
        parentLinked++;
      } catch { /* ignore */ }
    }
  }
  console.log(`  Parent links resolved: ${parentLinked}`);
}

// ─── 2. Import HelpDesk Tickets ────────────────────────────────────
async function importHelpDeskTickets() {
  console.log('\n═══ Importing HelpDesk Tickets ═══');
  const rows = readCsv('Assistenza_clienti.csv');
  console.log(`  Rows in CSV: ${rows.length}`);

  let imported = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const ticketNumber = trim(row['Numero ticket']);
    const title = trim(row['Titolo']);
    if (!ticketNumber || !title) { errors++; continue; }

    const existing = await prisma.helpDeskTicket.findUnique({ where: { ticketNumber } });
    if (existing) { skipped++; continue; }

    let status = trim(row['Stato']) || 'Aperto';
    if (status === 'Closed') status = 'Chiuso';
    if (status === 'Open') status = 'Aperto';
    if (status === 'In Progress') status = 'In Lavorazione';
    if (status === 'Wait For Response') status = 'In Attesa';

    try {
      await prisma.helpDeskTicket.create({
        data: {
          ticketNumber,
          title,
          status,
          priority: trim(row['Priorit\u00e0'] || row['Priorità']),
          callType: trim(row['Tipo chiamata']),
          ticketOrigin: trim(row['Origine ticket']),
          category: trim(row['Categoria']),
          organizationId: lookupOrg(row['Nome Organizzazione']),
          assignedToId: lookupUser(row['Assegnato a']),
          description: trim(row['Descrizione']),
          solution: trim(row['Soluzione']),
          days: parseFloat8(row['Giorni']),
          hours: parseFloat8(row['Durata Intervento (h)']),
          keywords: trim(row['Parole chiave']),
          technicianName: trim(row['Nome del tecnico']),
          createdAt: parseDate(row['Orario creazione']) ?? undefined,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 5) console.error(`  Error on "${ticketNumber}": ${err.message}`);
    }

    if ((imported + skipped + errors) % 5000 === 0) {
      console.log(`  ... processed ${imported + skipped + errors}/${rows.length}`);
    }
  }

  console.log(`  Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors}`);
}

// ─── 3. Import Service Contracts ────────────────────────────────────
async function importServiceContracts() {
  console.log('\n═══ Importing Service Contracts ═══');
  const rows = readCsv('Contratti_di_servizio.csv');
  console.log(`  Rows in CSV: ${rows.length}`);

  let imported = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const contractNumber = trim(row['Numero contratto']);
    if (!contractNumber) { errors++; continue; }

    const existing = await prisma.serviceContract.findUnique({ where: { contractNumber } });
    if (existing) { skipped++; continue; }

    let status = trim(row['Stato']) || 'Attivo';
    if (status === 'In Progress') status = 'Attivo';
    if (status === 'Complete') status = 'Completato';
    if (status === 'Archived') status = 'Archiviato';

    // Column names have HTML entities in this CSV
    const trackingUnit = trim(row['Unit\u00e0 di misura'] || row['Unit&agrave; di misura']);
    const totalUnits = parseFloat8(row['Unit\u00e0 totali'] || row['Unit&agrave; totali']);
    const usedUnits = parseFloat8(row['Unit\u00e0 utilizzate'] || row['Unit&agrave; utilizzate']);
    const priority = trim(row['Priorit\u00e0'] || row['Priorit&agrave;']);

    try {
      await prisma.serviceContract.create({
        data: {
          contractNumber,
          subject: trim(row['Soggetto']),
          contractType: extractRef(row['Tipo contratto']),
          status,
          frequency: trim(row['Frequenza']),
          contractValue: parseFloat8(row['Valore contratto']),
          startDate: parseDate(row['Data inizio']),
          dueDate: parseDate(row['Data scadenza']),
          nextInvoiceDate: parseDate(row['Data prossima fattura']),
          organizationId: lookupOrg(row['Relazionato a']),
          assignedToId: lookupUser(row['Assegnato a']),
          isConsultecno: parseBool(row['Contratto Consultecno']),
          isPaid: parseBool(row['Pagato']),
          invoiceRef: trim(row['Fattura di riferimento']),
          trackingUnit,
          totalUnits,
          usedUnits,
          priority,
          createdAt: parseDate(row['Orario creazione']) ?? undefined,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 5) console.error(`  Error on "${contractNumber}": ${err.message}`);
    }
  }

  console.log(`  Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors}`);
}

// ─── 4. Import Quotes (VtQuote) ─────────────────────────────────────
async function importQuotes() {
  console.log('\n═══ Importing Quotes (VtQuote) ═══');
  const rows = readCsv('Preventivi.csv');
  console.log(`  Rows in CSV: ${rows.length}`);

  const seen = new Set<string>();
  let imported = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const quoteNumber = trim(row['Nr. preventivo']);
    const subject = trim(row['Soggetto']);
    if (!quoteNumber || !subject) { errors++; continue; }

    if (seen.has(quoteNumber)) continue;
    seen.add(quoteNumber);

    const existing = await prisma.vtQuote.findUnique({ where: { quoteNumber } });
    if (existing) { skipped++; continue; }

    try {
      await prisma.vtQuote.create({
        data: {
          quoteNumber,
          subject,
          stage: trim(row['Stadio preventivo']) || 'Creato',
          validUntil: parseDate(row['Valido fino a']),
          organizationId: lookupOrg(row['Nome Organizzazione']),
          assignedToId: lookupUser(row['Assegnato a']),
          billStreet: trim(row['Indirizzo di fatturazione']),
          billCity: trim(row['Citt\u00e0 fatturazione'] || row['Citt&agrave; fatturazione']),
          billState: trim(row['Provincia fatturazione']),
          billCode: trim(row['Cap fatturazione']),
          billCountry: trim(row['Stato fatturazione']),
          shipStreet: trim(row['Indirizzo di spedizione']),
          shipCity: trim(row['Citt\u00e0 di spedizione'] || row['Citt&agrave; di spedizione']),
          shipState: trim(row['Provincia di spedizione']),
          shipCode: trim(row['Cap spedizione']),
          shipCountry: trim(row['Stato di spedizione']),
          termsConditions: trim(row['Termini e condizioni']),
          description: trim(row['Descrizione']),
          createdAt: parseDate(row['Orario creazione']) ?? undefined,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 5) console.error(`  Error on "${quoteNumber}": ${err.message}`);
    }
  }

  console.log(`  Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors} | Line items deduped: ${rows.length - seen.size}`);
}

// ─── 5. Import Sales Orders ─────────────────────────────────────────
async function importSalesOrders() {
  console.log('\n═══ Importing Sales Orders ═══');
  const rows = readCsv('Ordini_di_vendita.csv');
  console.log(`  Rows in CSV: ${rows.length}`);

  const seen = new Set<string>();
  let imported = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const orderNumber = trim(row['No. ordine di vendita']);
    const subject = trim(row['Soggetto']);
    if (!orderNumber || !subject) { errors++; continue; }

    if (seen.has(orderNumber)) continue;
    seen.add(orderNumber);

    const existing = await prisma.salesOrder.findUnique({ where: { orderNumber } });
    if (existing) { skipped++; continue; }

    try {
      await prisma.salesOrder.create({
        data: {
          orderNumber,
          subject,
          status: trim(row['Stato']) || 'Creato',
          // "Stato fatturazione" = invoice status (col 6), "Stato fatturazione_2" = bill country (col 47)
          invoiceStatus: trim(row['Stato fatturazione']),
          dueDate: parseDate(row['Data di scadenza']),
          organizationId: lookupOrg(row['Nome Organizzazione']),
          assignedToId: lookupUser(row['Assegnato a']),
          salesCommission: parseFloat8(row['Commissione di vendita']),
          carrier: trim(row['Vettore']),
          consultecnoContract: trim(row['Contratto Consultecno e NAS']),
          opening: trim(row['Apertura']),
          enableRecurring: parseBool(row['Abilita ricorrenza']),
          recurringFreq: trim(row['Frequenza']),
          startPeriod: parseDate(row['Inizio periodo']),
          endPeriod: parseDate(row['Fine periodo']),
          paymentDuration: trim(row['Durata pagamento']),
          billStreet: trim(row['Indirizzo di fatturazione']),
          billCity: trim(row['Citt\u00e0 fatturazione'] || row['Citt&agrave; fatturazione']),
          billState: trim(row['Provincia fatturazione']),
          billCode: trim(row['Cap fatturazione']),
          billCountry: trim(row['Stato fatturazione_2']),
          shipStreet: trim(row['Indirizzo di spedizione']),
          shipCity: trim(row['Citt\u00e0 di spedizione'] || row['Citt&agrave; di spedizione']),
          shipState: trim(row['Provincia di spedizione']),
          shipCode: trim(row['Cap spedizione']),
          shipCountry: trim(row['Stato di spedizione']),
          termsConditions: trim(row['Termini e condizioni']),
          description: trim(row['Descrizione']),
          createdAt: parseDate(row['Orario creazione']) ?? undefined,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 5) console.error(`  Error on "${orderNumber}": ${err.message}`);
    }

    if ((imported + skipped + errors) % 2000 === 0) {
      console.log(`  ... processed ${imported + skipped + errors}/${seen.size}`);
    }
  }

  console.log(`  Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors} | Line items deduped: ${rows.length - seen.size}`);
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   VTiger CSV Import into CRM                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\nCSV directory: ${CSV_DIR}`);

  const files = ['Organizzazioni.csv', 'Assistenza_clienti.csv', 'Contratti_di_servizio.csv', 'Preventivi.csv', 'Ordini_di_vendita.csv'];
  for (const f of files) {
    if (!fs.existsSync(path.join(CSV_DIR, f))) {
      console.error(`Missing CSV file: ${f}`);
      process.exit(1);
    }
  }
  console.log('All CSV files found.\n');

  console.log('Building lookup caches...');
  await buildUserCache();

  // 1. Organizations (must be first - others reference it)
  await importOrganizations();

  // Rebuild org cache after organizations are imported
  await buildOrgCache();

  // 2. HelpDesk Tickets
  await importHelpDeskTickets();

  // 3. Service Contracts
  await importServiceContracts();

  // 4. Quotes
  await importQuotes();

  // 5. Sales Orders
  await importSalesOrders();

  // Final summary
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Import Complete!                           ║');
  console.log('╚══════════════════════════════════════════════╝');

  const [orgCount, ticketCount, contractCount, quoteCount, orderCount] = await Promise.all([
    prisma.organization.count(),
    prisma.helpDeskTicket.count(),
    prisma.serviceContract.count(),
    prisma.vtQuote.count(),
    prisma.salesOrder.count(),
  ]);

  console.log(`\nDatabase totals:`);
  console.log(`  Organizations:     ${orgCount}`);
  console.log(`  HelpDesk Tickets:  ${ticketCount}`);
  console.log(`  Service Contracts: ${contractCount}`);
  console.log(`  Quotes:            ${quoteCount}`);
  console.log(`  Sales Orders:      ${orderCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
