# Database Migrations

Questa directory contiene le migrazioni SQL per il database MySQL di produzione.

## Migrazione: Create Projects Table

Aggiunge la tabella `projects` per il tracciamento di budget e redditività dei progetti.

### Metodo 1: Script Automatico (Consigliato)

```bash
cd /var/www/crm-dashboard/backend/migrations
chmod +x apply_migration.sh
./apply_migration.sh
```

Lo script:
- Carica automaticamente le credenziali dal file `.env`
- Verifica se la tabella esiste già
- Applica la migrazione
- Verifica che la tabella sia stata creata correttamente

### Metodo 2: Manuale con MySQL CLI

```bash
cd /var/www/crm-dashboard/backend/migrations

# Sostituisci con le tue credenziali
mysql -u root -p crm_dashboard < create_projects_table.sql
```

### Metodo 3: Prisma (se il database è vuoto)

```bash
cd /var/www/crm-dashboard/backend

# SOLO se il database è completamente vuoto
npx prisma migrate deploy
```

**⚠️ ATTENZIONE**: Il Metodo 3 funziona solo su database vuoti. Per database esistenti, usa il Metodo 1 o 2.

## Dopo la Migrazione

Una volta applicata la migrazione:

```bash
cd /var/www/crm-dashboard/backend

# 1. Rigenera il Prisma Client
npx prisma generate

# 2. Ricompila il backend
npm run build

# 3. Riavvia il server
pm2 restart <nome-processo>
# oppure
pm2 restart all
```

## Verifica

Verifica che la tabella sia stata creata correttamente:

```sql
-- Connettiti al database
mysql -u root -p crm_dashboard

-- Verifica struttura tabella
DESCRIBE projects;

-- Esci
exit;
```

## Rollback

Se necessario, per rimuovere la tabella:

```sql
DROP TABLE IF EXISTS projects;
```

**⚠️ ATTENZIONE**: Questo eliminerà tutti i dati dei progetti!
