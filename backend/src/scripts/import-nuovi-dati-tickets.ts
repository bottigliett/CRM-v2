import * as path from 'path';
import * as XLSX from 'xlsx';
import prisma from '../config/database';

// ─── Config ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '../NUOVI_DATI');
const FILE = path.join(DATA_DIR, 'report assitenza per export.xls');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Utility ──────────────────────────────────────────────────────────
function trim(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s === '-' || s === '--' ? null : s;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  // xlsx may return JS Date objects or serial numbers
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0);
    return null;
  }
  const s = String(val).trim();
  if (!s || s === '--') return null;
  // Try dd-mm-yyyy HH:MM:SS or dd/mm/yyyy HH:MM:SS
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, dd, mm, yyyy, hh, mi, ss] = match;
    return new Date(
      parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
      hh ? parseInt(hh) : 0, mi ? parseInt(mi) : 0, ss ? parseInt(ss) : 0
    );
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('Reading XLS file...');

  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // Normalize column keys: strip leading/trailing spaces (Excel often adds them)
  const rows = rawRows.map(row => {
    const normalized: any = {};
    for (const key of Object.keys(row)) normalized[key.trim()] = row[key];
    return normalized;
  });

  console.log(`Ticket rows: ${rows.length}`);

  // Print actual column names from first row for diagnostics
  if (rows.length > 0) {
    console.log('Colonne trovate nell\'Excel:', Object.keys(rows[0]).join(' | '));
    console.log('Prima riga (sample):');
    console.log('  Codice uff. =', JSON.stringify(rows[0]['Codice uff.']));
    console.log('  Denominazione uff. =', JSON.stringify(rows[0]['Denominazione uff.']));
    console.log('  Assegnato a =', JSON.stringify(rows[0]['Assegnato a']));
  }

  // Build org lookup by code and denomination
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, code: true, name: true, denomination: true },
  });
  console.log(`Orgs in DB: ${allOrgs.length}, con codice: ${allOrgs.filter(o => o.code).length}`);

  const orgByCode = new Map<string, number>();
  const orgByName = new Map<string, number>();
  for (const org of allOrgs) {
    if (org.code) {
      orgByCode.set(org.code.toLowerCase().trim(), org.id);
      // also strip non-alphanumeric for fuzzy match
      orgByCode.set(org.code.toLowerCase().replace(/[^a-z0-9]/g, ''), org.id);
    }
    if (org.denomination) orgByName.set(org.denomination.toLowerCase().trim(), org.id);
    if (org.name) orgByName.set(org.name.toLowerCase().trim(), org.id);
  }

  // Build user lookup
  const users = await prisma.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true },
  });
  console.log('Admin users in DB:');
  for (const u of users) {
    console.log(`  id=${u.id} username=${u.username} firstName=${u.firstName} lastName=${u.lastName}`);
  }

  const userMap = new Map<string, number>();
  for (const u of users) {
    if (u.username) userMap.set(u.username.toLowerCase(), u.id);
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    if (fullName) userMap.set(fullName, u.id);
    const reverseName = `${u.lastName || ''} ${u.firstName || ''}`.trim().toLowerCase();
    if (reverseName && reverseName !== fullName) userMap.set(reverseName, u.id);
    // also try single name parts
    if (u.firstName) userMap.set(u.firstName.toLowerCase().trim(), u.id);
    if (u.lastName) userMap.set(u.lastName.toLowerCase().trim(), u.id);
  }

  // Map tickets
  const tickets: any[] = [];
  let ticketCounter = 0;
  let noOrgCount = 0;
  let noUserCount = 0;

  for (const row of rows) {
    const codiceUff = trim(row['Codice uff.']);
    const denomUff = trim(row['Denominazione uff.']);

    // Lookup organization — try code (also normalized), then denomination/name
    let organizationId: number | null = null;
    if (codiceUff) {
      organizationId = orgByCode.get(codiceUff.toLowerCase().trim())
        || orgByCode.get(codiceUff.toLowerCase().replace(/[^a-z0-9]/g, ''))
        || null;
    }
    if (!organizationId && denomUff) {
      organizationId = orgByName.get(denomUff.toLowerCase().trim()) || null;
    }
    if (!organizationId) noOrgCount++;

    // Lookup assigned user
    const assignedName = trim(row['Assegnato a']);
    let assignedToId: number | null = null;
    if (assignedName) {
      assignedToId = userMap.get(assignedName.toLowerCase().trim()) || null;
      if (!assignedToId) noUserCount++;
    }

    // Ticket number from file or generate
    const ticketNumber = trim(row['Numero ticket']) || `IMP-${String(++ticketCounter).padStart(5, '0')}`;

    const createdAt = parseDate(row['Orario creazione']);

    tickets.push({
      ticketNumber,
      title: trim(row['Titolo']) || 'Senza titolo',
      status: trim(row['Stato']) || 'Aperto',
      callType: trim(row['Tipo chiamata']),
      ticketOrigin: trim(row['Origine ticket']),
      description: trim(row['Descrizione']),
      organizationId,
      assignedToId,
      createdAt: createdAt || new Date(),
    });
  }

  console.log(`Mapped tickets: ${tickets.length}`);
  console.log(`Tickets senza org trovata: ${noOrgCount}/${tickets.length}`);
  console.log(`Tickets con "Assegnato a" non trovato: ${noUserCount}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    console.log('First 3 tickets:');
    for (const t of tickets.slice(0, 3)) {
      console.log(JSON.stringify(t, null, 2));
    }
    console.log(`\nTotal: ${tickets.length} tickets would be imported.`);
    return;
  }

  // Delete existing helpdesk tickets
  console.log('Deleting existing helpdesk tickets...');
  await prisma.helpDeskTicket.deleteMany({});
  console.log('Existing tickets deleted.');

  // Import tickets in batches
  console.log('Importing tickets...');
  let imported = 0;
  let errors = 0;

  for (const ticket of tickets) {
    try {
      const { createdAt: ticketCreatedAt, ...ticketData } = ticket;
      const created = await prisma.helpDeskTicket.create({ data: ticketData });
      if (ticketCreatedAt instanceof Date && !isNaN(ticketCreatedAt.getTime())) {
        const dateStr = ticketCreatedAt.toISOString().slice(0, 19).replace('T', ' ');
        await prisma.$executeRawUnsafe(
          `UPDATE help_desk_tickets SET created_at = '${dateStr}' WHERE id = ${created.id}`
        );
      }
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 10) {
        console.error(`Error importing ticket "${ticket.ticketNumber}": ${err.message}`);
      }
    }
  }

  if (errors > 10) {
    console.error(`... and ${errors - 10} more errors.`);
  }

  console.log(`\nImport completed: ${imported}/${tickets.length} tickets imported (${errors} errors).`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
