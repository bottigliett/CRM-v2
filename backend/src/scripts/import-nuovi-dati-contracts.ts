import * as path from 'path';
import * as XLSX from 'xlsx';
import prisma from '../config/database';

// ─── Config ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '../NUOVI_DATI');
const FILE = path.join(DATA_DIR, 'CONTRATTI per export.xls');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Utility ──────────────────────────────────────────────────────────
function trim(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s === '-' || s === '--' ? null : s;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s || s === '-' || s === '--') return null;
  // ISO format "2017-01-01" or similar
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseFloat2(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim().replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
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

  console.log(`Contract rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Columns:', Object.keys(rows[0]).join(' | '));
    console.log('Sample row:', JSON.stringify(rows[0], null, 2));
  }

  // Build org lookup maps
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, code: true, name: true, denomination: true },
  });
  console.log(`Orgs in DB: ${allOrgs.length}`);

  const orgByCode = new Map<string, number>();
  const orgByName = new Map<string, number>();
  for (const org of allOrgs) {
    if (org.code) {
      orgByCode.set(org.code.toLowerCase().trim(), org.id);
      orgByCode.set(org.code.toLowerCase().replace(/[^a-z0-9]/g, ''), org.id);
    }
    if (org.denomination) orgByName.set(org.denomination.toLowerCase().trim(), org.id);
    if (org.name) orgByName.set(org.name.toLowerCase().trim(), org.id);
  }

  // Map contracts
  const contracts: any[] = [];
  let noOrgCount = 0;

  for (const row of rows) {
    const codiceUff   = trim(row['Codice uff.']);
    const denomUff    = trim(row['Denominazione uff.']);
    const relazionato = trim(row['Relazionato a']);

    let organizationId: number | null = null;
    if (codiceUff) {
      organizationId = orgByCode.get(codiceUff.toLowerCase().trim())
        || orgByCode.get(codiceUff.toLowerCase().replace(/[^a-z0-9]/g, ''))
        || null;
    }
    if (!organizationId && denomUff) {
      organizationId = orgByName.get(denomUff.toLowerCase().trim()) || null;
    }
    if (!organizationId && relazionato) {
      organizationId = orgByName.get(relazionato.toLowerCase().trim()) || null;
    }
    if (!organizationId) noOrgCount++;

    const isConsultecno = String(row['Contratto Consultecno']).trim().toLowerCase() === 'yes';

    contracts.push({
      contractNumber: trim(row['Numero contratto']) || `IMP-${String(contracts.length + 1).padStart(5, '0')}`,
      contractType:   trim(row['Tipo contratto']),
      status:         trim(row['Stato']) || 'Attivo',
      contractValue:  parseFloat2(row['Valore contratto']),
      startDate:      parseDate(row['Data inizio']),
      nextInvoiceDate: parseDate(row['Data prossima fattura']),
      subject:        trim(row['Soggetto']),
      isConsultecno,
      organizationId,
    });
  }

  console.log(`Mapped contracts: ${contracts.length}`);
  console.log(`Contracts senza org trovata: ${noOrgCount}/${contracts.length}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    console.log('First 3 contracts:');
    for (const c of contracts.slice(0, 3)) console.log(JSON.stringify(c, null, 2));
    console.log(`\nTotal: ${contracts.length} contracts would be imported.`);
    return;
  }

  // Delete existing contracts
  console.log('Deleting existing contracts...');
  await prisma.serviceContract.deleteMany({});
  console.log('Deleted.');

  // Import
  console.log('Importing contracts...');
  let imported = 0;
  let errors = 0;

  for (const c of contracts) {
    try {
      await prisma.serviceContract.create({
        data: {
          contractNumber:  String(c.contractNumber),
          contractType:    c.contractType    ?? null,
          status:          String(c.status),
          contractValue:   c.contractValue   ?? null,
          startDate:       c.startDate       ?? null,
          nextInvoiceDate: c.nextInvoiceDate ?? null,
          subject:         c.subject         ?? null,
          isConsultecno:   c.isConsultecno   ?? false,
          organizationId:  c.organizationId  ?? null,
        },
      });
      imported++;
    } catch (err: any) {
      errors++;
      if (errors <= 10) console.error(`Error importing "${c.contractNumber}": ${err.message}`);
    }
  }

  if (errors > 10) console.error(`... and ${errors - 10} more errors.`);
  console.log(`\nImport completed: ${imported}/${contracts.length} contracts (${errors} errors).`);
}

main()
  .catch(err => { console.error('Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
