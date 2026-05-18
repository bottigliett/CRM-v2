import * as path from 'path';
import * as XLSX from 'xlsx';
import prisma from '../config/database';

// ─── Config ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '../NUOVI_DATI');
const FILE = path.join(DATA_DIR, 'Preventivi per export.xls');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Utility ──────────────────────────────────────────────────────────
function trim(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s === '-' || s === '--' ? null : s;
}

function mapStage(val: string | null): string {
  if (!val) return 'Creato';
  const map: Record<string, string> = {
    'Scaduto': 'Scaduto',
    'Consegnato': 'Consegnato',
    'Revisionato': 'Revisionato',
    'Accettato': 'Accettato',
    'Rifiutato': 'Rifiutato',
    'Annullato': 'Annullato',
    'Creato': 'Creato',
  };
  return map[val] ?? val;
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('Reading XLS file...');

  const wb = XLSX.readFile(FILE, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // Normalize column keys (strip spaces)
  const rows = rawRows.map(row => {
    const n: any = {};
    for (const k of Object.keys(row)) n[k.trim()] = row[k];
    return n;
  });

  console.log(`Quote rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Columns:', Object.keys(rows[0]).join(' | '));
    console.log('Sample row:', JSON.stringify(rows[0], null, 2));
  }

  // Build org lookup maps
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, code: true, name: true, denomination: true },
  });
  console.log(`Orgs in DB: ${allOrgs.length}`);

  const orgByName = new Map<string, number>();
  for (const org of allOrgs) {
    if (org.denomination) orgByName.set(org.denomination.toLowerCase().trim(), org.id);
    if (org.name) orgByName.set(org.name.toLowerCase().trim(), org.id);
  }

  // Build user lookup maps
  const users = await prisma.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true },
  });
  const userMap = new Map<string, number>();
  for (const u of users) {
    if (u.username) userMap.set(u.username.toLowerCase(), u.id);
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    if (fullName) userMap.set(fullName, u.id);
    const reverseName = `${u.lastName || ''} ${u.firstName || ''}`.trim().toLowerCase();
    if (reverseName && reverseName !== fullName) userMap.set(reverseName, u.id);
  }

  // Map quotes
  const quotes: any[] = [];
  let noOrgCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const orgName = trim(row['Nome Organizzazione']);

    let organizationId: number | null = null;
    if (orgName) {
      organizationId = orgByName.get(orgName.toLowerCase().trim()) || null;
    }
    if (!organizationId) noOrgCount++;

    const assignedName = trim(row['Assegnato a']);
    let assignedToId: number | null = null;
    if (assignedName) {
      assignedToId = userMap.get(assignedName.toLowerCase().trim()) || null;
    }

    quotes.push({
      quoteNumber:    `PREV-${String(i + 1).padStart(5, '0')}`,
      subject:        trim(row['Soggetto']) || 'Senza oggetto',
      stage:          mapStage(trim(row['Stadio preventivo'])),
      organizationId,
      assignedToId,
    });
  }

  console.log(`Mapped quotes: ${quotes.length}`);
  console.log(`Quotes senza org trovata: ${noOrgCount}/${quotes.length}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    console.log('First 3 quotes:');
    for (const q of quotes.slice(0, 3)) console.log(JSON.stringify(q, null, 2));
    console.log(`\nTotal: ${quotes.length} quotes would be imported.`);
    return;
  }

  // Delete existing quotes
  console.log('Deleting existing quotes...');
  await prisma.vtQuote.deleteMany({});
  console.log('Deleted.');

  // Import
  console.log('Importing quotes...');
  let imported = 0;
  let errors = 0;

  for (const q of quotes) {
    try {
      await prisma.vtQuote.create({
        data: {
          quoteNumber:    String(q.quoteNumber),
          subject:        String(q.subject),
          stage:          String(q.stage),
          organizationId: q.organizationId ?? null,
          assignedToId:   q.assignedToId   ?? null,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 10) console.error(`Error importing "${q.quoteNumber}": ${err.message}`);
    }
  }

  if (errors > 10) console.error(`... and ${errors - 10} more errors.`);
  console.log(`\nImport completed: ${imported}/${quotes.length} quotes (${errors} errors).`);
}

main()
  .catch(err => { console.error('Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
