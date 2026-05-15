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
  return s === '' || s === '--' ? null : s;
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
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  console.log(`Ticket rows: ${rows.length}`);

  // Build org lookup by code
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, code: true, name: true },
  });
  const orgByCode = new Map<string, number>();
  const orgByName = new Map<string, number>();
  for (const org of allOrgs) {
    if (org.code) orgByCode.set(org.code.toLowerCase(), org.id);
    if (org.name) orgByName.set(org.name.toLowerCase(), org.id);
  }

  // Build user lookup
  const users = await prisma.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true },
  });
  const userMap = new Map<string, number>();
  for (const u of users) {
    if (u.username) userMap.set(u.username.toLowerCase(), u.id);
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    if (fullName) userMap.set(fullName, u.id);
  }

  // Map tickets
  const tickets: any[] = [];
  let ticketCounter = 0;
  let noOrgCount = 0;

  for (const row of rows) {
    const codiceUff = trim(row['Codice uff.']);
    const denomUff = trim(row['Denominazione uff.']);

    // Lookup organization
    let organizationId: number | null = null;
    if (codiceUff) {
      organizationId = orgByCode.get(codiceUff.toLowerCase()) || null;
    }
    if (!organizationId && denomUff) {
      organizationId = orgByName.get(denomUff.toLowerCase()) || null;
    }
    if (!organizationId) noOrgCount++;

    // Lookup assigned user
    const assignedName = trim(row['Assegnato a']);
    let assignedToId: number | null = null;
    if (assignedName) {
      assignedToId = userMap.get(assignedName.toLowerCase()) || null;
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
  console.log(`Tickets without matching org: ${noOrgCount}`);

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
      await prisma.helpDeskTicket.create({ data: ticket });
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
