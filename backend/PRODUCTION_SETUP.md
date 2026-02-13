# Production Server Setup (MySQL)

## Importante: Differenze Locale vs Produzione

- **Locale (Sviluppo)**: Usa SQLite per facilità di sviluppo
- **Produzione (Server)**: Usa MySQL per performance e affidabilità

## Configurazione Schema Prisma per Produzione

Sul server di produzione, modifica `backend/prisma/schema.prisma`:

### Cambia la sezione datasource da:
```prisma
datasource db {
  provider = "sqlite"
}
```

### A:
```prisma
datasource db {
  provider = "mysql"
}
```

**IMPORTANTE**: Questa è l'UNICA modifica necessaria. Non committare questo cambio su Git, è solo per il server!

## Deploy Passo-Passo

### 1. Pull del codice

```bash
cd /var/www/crm-dashboard

# Se hai modifiche locali su schema.prisma (normale)
git stash                  # Salva le tue modifiche MySQL
git pull origin main       # Aggiorna il codice
git stash pop              # Ripristina la configurazione MySQL

# Oppure, se non hai altre modifiche importanti
git checkout -- backend/prisma/schema.prisma  # Scarta modifiche locali
git pull origin main                           # Aggiorna
```

### 2. Configura MySQL nel schema

```bash
# Apri schema.prisma
nano backend/prisma/schema.prisma

# Cambia provider da "sqlite" a "mysql"
# Salva e chiudi (Ctrl+O, Enter, Ctrl+X)
```

### 3. Applica la migrazione

**Metodo Consigliato - Script Automatico:**

```bash
cd backend/migrations
chmod +x apply_migration.sh
./apply_migration.sh
```

**Metodo Alternativo - Manuale:**

```bash
# Connetti al database
mysql -u root -p

# Una volta connesso:
USE crm_dashboard;
SOURCE /var/www/crm-dashboard/backend/migrations/create_projects_table.sql;
exit;
```

### 4. Aggiorna il backend

```bash
cd /var/www/crm-dashboard/backend

# Rigenera Prisma Client (con la nuova tabella)
npx prisma generate

# Ricompila TypeScript
npm run build
```

### 5. Riavvia il server

```bash
# Trova il nome del processo
pm2 list

# Riavvia (sostituisci con il nome corretto)
pm2 restart backend
# oppure riavvia tutto
pm2 restart all

# Verifica i log
pm2 logs
```

## Verifica Deployment

### 1. Verifica Database

```bash
mysql -u root -p crm_dashboard -e "DESCRIBE projects;"
```

Dovresti vedere la struttura della tabella projects.

### 2. Verifica API

```bash
# Test endpoint
curl http://localhost:3001/api/projects

# Dovrebbe rispondere con JSON (anche se vuoto)
```

### 3. Verifica Frontend

Apri il browser e vai su: `http://185.229.236.196/projects`

## Troubleshooting

### "Error: Provider mysql is not supported"
- Controlla che `schema.prisma` abbia `provider = "mysql"`
- Rigenera il client: `npx prisma generate`

### "Table projects already exists"
- Va bene! La tabella è già stata creata
- Continua con `npx prisma generate`

### "Cannot find module @prisma/client"
```bash
npm install @prisma/client
npx prisma generate
```

### Backend non si riavvia
```bash
# Verifica errori
pm2 logs

# Prova a stoppare e riavviare
pm2 stop all
pm2 start all
```

## Aggiornamenti Futuri

Per aggiornamenti futuri con nuove migrazioni:

1. Pull del codice
2. Controlla se ci sono nuovi file in `backend/migrations/`
3. Esegui il nuovo script di migrazione
4. Rigenera Prisma Client
5. Ricompila e riavvia

## Rollback (Se Necessario)

Se qualcosa va storto:

```bash
# 1. Ferma il backend
pm2 stop all

# 2. Rimuovi la tabella (perderai i dati!)
mysql -u root -p crm_dashboard -e "DROP TABLE IF EXISTS projects;"

# 3. Torna alla versione precedente
git log --oneline  # Trova l'hash del commit precedente
git checkout <hash-commit-precedente>

# 4. Ricompila
cd backend
npm run build

# 5. Riavvia
pm2 restart all
```
