import * as path from 'path';
import * as XLSX from 'xlsx';
import prisma from '../config/database';

// ─── Config ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '../NUOVI_DATI');
const FILE1 = path.join(DATA_DIR, 'Anagrafiche.xls');
const FILE2 = path.join(DATA_DIR, 'anagrafiche per export.xls');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Utility ──────────────────────────────────────────────────────────
function trim(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' || s === '-' || s === '--' ? null : s;
}

function mapIndustry(val: string | null): string | null {
  if (!val) return null;
  if (val === 'Finanziario') return 'Creditizio';
  return val;
}

function mapCoordinator(val: string | null): string | null {
  if (!val) return null;
  // "segretaria" label becomes "coordinatrice" conceptually,
  // but we keep the actual name value as-is
  return val;
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('Reading XLS files...');

  const wb1 = XLSX.readFile(FILE1);
  const ws1 = wb1.Sheets[wb1.SheetNames[0]];
  const rows1: any[] = XLSX.utils.sheet_to_json(ws1, { defval: '' });

  const wb2 = XLSX.readFile(FILE2);
  const ws2 = wb2.Sheets[wb2.SheetNames[0]];
  const rows2: any[] = XLSX.utils.sheet_to_json(ws2, { defval: '' });

  console.log(`File 1 (Anagrafiche): ${rows1.length} righe`);
  console.log(`File 2 (anagrafiche per export): ${rows2.length} righe`);

  // Build lookup map for file 2 by "Organizzazioni Codice"
  const file2Map = new Map<string, any>();
  for (const row of rows2) {
    const code = trim(row['Organizzazioni Codice']);
    if (code) {
      file2Map.set(code, row);
    }
  }
  console.log(`File 2 lookup map: ${file2Map.size} entries`);

  // Build user lookup map (username/firstName lastName → id)
  const users = await prisma.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true },
  });
  const userMap = new Map<string, number>();
  for (const u of users) {
    if (u.username) userMap.set(u.username.toLowerCase(), u.id);
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    if (fullName) userMap.set(fullName, u.id);
  }

  // Merge rows
  const orgs: any[] = [];
  for (const r1 of rows1) {
    const code = trim(r1['Codice']);
    const r2 = code ? file2Map.get(code) : null;

    // Lookup assignedTo from file 2
    let assignedToId: number | null = null;
    if (r2) {
      const assignedName = trim(r2['Organizzazioni Assegnato a']);
      if (assignedName) {
        assignedToId = userMap.get(assignedName.toLowerCase()) || null;
      }
    }

    orgs.push({
      code: code,
      denomination: trim(r1['Denominazione']),
      name: trim(r1['Nome Organizzazione']) || trim(r1['Denominazione']) || 'Senza nome',
      vatNumber: trim(r1['P.Iva']),
      phone: trim(r1['Telefono']),
      mobile: trim(r1['Cellulare']),
      shareholders: trim(r1['Decisore']),
      legalRep: trim(r1['Responsabile']),
      coordinator: mapCoordinator(trim(r1['Segretaria'])),
      industry: mapIndustry(trim(r1['Settore'])),
      billStreet: trim(r1['Indirizzo di fatturazione']),
      billCity: trim(r1['Città fatturazione']),
      billState: trim(r1['Provincia fatturazione']),
      billCode: trim(r1['Cap fatturazione']),
      billCountry: trim(r1['Stato fatturazione']),
      shipStreet: trim(r1['Indirizzo di spedizione']),
      shipCity: trim(r1['Città di spedizione']),
      shipState: trim(r1['Provincia di spedizione']),
      shipCode: trim(r1['Cap spedizione']),
      shipCountry: trim(r1['Stato di spedizione']),
      bankName: trim(r1['Banca di appoggio']),
      iban: trim(r1['IBAN']),
      accountType: trim(r1['Tipo']),
      // File 2 fields
      devices: r2 ? trim(r2['Organizzazioni Dispositivi']) : null,
      nasInfo: r2 ? trim(r2['Organizzazioni NAS']) : null,
      nasContract: r2 ? trim(r2['Organizzazioni Contratto NAS']) : null,
      email: r2 ? trim(r2['Organizzazioni Email']) : null,
      uniqueCode: r2 ? trim(r2['Organizzazioni Codice Univoco']) : null,
      pec: r2 ? trim(r2['Organizzazioni PEC']) : null,
      description: r2 ? trim(r2['Organizzazioni Descrizione']) : null,
      assignedToId,
      isActive: true,
    });
  }

  console.log(`Merged organizations: ${orgs.length}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    console.log('First 3 organizations:');
    for (const o of orgs.slice(0, 3)) {
      console.log(JSON.stringify(o, null, 2));
    }
    console.log(`\nTotal: ${orgs.length} organizations would be imported.`);
    return;
  }

  // Delete existing data in correct order (cascade)
  console.log('Deleting existing data...');
  await prisma.helpDeskTicket.deleteMany({});
  await prisma.serviceContract.deleteMany({});
  await prisma.vtQuote.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log('Existing data deleted.');

  // Import organizations in batches
  console.log('Importing organizations...');
  let imported = 0;
  for (const org of orgs) {
    try {
      await prisma.organization.create({ data: org });
      imported++;
    } catch (err: any) {
      console.error(`Error importing org "${org.name}" (code: ${org.code}): ${err.message}`);
    }
  }

  console.log(`\nImport completed: ${imported}/${orgs.length} organizations imported.`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
