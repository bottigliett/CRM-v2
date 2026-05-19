import * as path from 'path';
import * as XLSX from 'xlsx';
import prisma from '../config/database';

const DATA_DIR = path.join(process.cwd(), '../NUOVI_DATI');
const FILE = path.join(DATA_DIR, 'anagrafiche per export2.xls');
const DRY_RUN = process.argv.includes('--dry-run');

function trim(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s === '-' || s === '--' ? null : s;
}

async function main() {
  console.log('Reading export2 file...');
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`Rows in file: ${rows.length}`);

  // Build map: code → isActive
  const activeMap = new Map<string, boolean>();
  for (const row of rows) {
    const code = trim(row['Organizzazioni Codice']);
    const activeVal = trim(row['Organizzazioni Attivo']);
    if (code) {
      activeMap.set(code, activeVal?.toLowerCase() === 'yes');
    }
  }
  console.log(`Codes in file: ${activeMap.size}`);

  // Get all organizations from DB
  const orgs = await prisma.organization.findMany({
    select: { id: true, code: true, isActive: true },
  });
  console.log(`Organizations in DB: ${orgs.length}`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const org of orgs) {
    if (!org.code) { skipped++; continue; }

    const newActive = activeMap.get(org.code);
    if (newActive === undefined) {
      notFound++;
      continue;
    }

    if (org.isActive === newActive) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${org.code}: ${org.isActive} → ${newActive}`);
    } else {
      await prisma.organization.update({
        where: { id: org.id },
        data: { isActive: newActive },
      });
    }
    updated++;
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already correct or no code): ${skipped}`);
  console.log(`  Not found in file: ${notFound}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN — no changes applied ---');
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
