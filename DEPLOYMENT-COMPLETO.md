# 🚀 Deployment Completo - Preventivi 3 Pacchetti + Fix Attivazione Cliente

## 📦 Cosa Include Questo Deployment

### 1. Sistema Preventivi con Obiettivi e Pacchetti ✨
- Nuovo wizard a 6 step per creare preventivi professionali
- Step 2: Obiettivi del progetto (title + description)
- Step 3: Pacchetti proposti con features (Base, Pro, Premium)
- Migration database: aggiunta campi `objectives` e `features`

### 2. Fix Attivazione Cliente ✅
- Risolto errore 401 "Token non fornito"
- Nuovi endpoint pubblici `/api/public/*` per attivazione
- Debug logger per tracciare richieste

## 🔧 Procedura di Deployment

### Connettiti al Server

```bash
ssh root@185.229.236.196
# Password: ceE2DS43PK
```

### 1. Backup del Database (Importante!)

```bash
mysqldump -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo > /root/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Pull Ultimo Codice

```bash
cd /var/www/crm-dashboard

# Ripristina eventuali modifiche locali
git restore .

# Pull codice
git pull origin main

# Verifica commit (devono essere presenti questi 3):
git log --oneline -3
```

Dovresti vedere:
```
1c1ad58 Fix client activation 401 error with public endpoints workaround
67c65f0 Add debug logging to client-auth routes
6844bda Implement 6-step quote creation with objectives and packages
```

### 3. Migration Database

```bash
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo
```

Esegui questo SQL:

```sql
-- Add objectives field to quotes table
ALTER TABLE quotes
ADD COLUMN objectives TEXT NULL COMMENT 'JSON array of project objectives'
AFTER description;

-- Add features field to quote_packages table
ALTER TABLE quote_packages
ADD COLUMN features TEXT NULL COMMENT 'JSON array of package features'
AFTER description;

-- Verifica che le colonne siano state create
SHOW COLUMNS FROM quotes LIKE 'objectives';
SHOW COLUMNS FROM quote_packages LIKE 'features';

-- Exit
exit;
```

### 4. Rebuild Backend

```bash
cd /var/www/crm-dashboard/backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Compile TypeScript
npx tsc

# Verifica che i nuovi file siano presenti
ls -lh dist/routes/public.routes.js
ls -lh dist/middleware/debug-logger.js
```

### 5. Restart Backend

```bash
pm2 restart crm-backend

# Aspetta 2-3 secondi per il riavvio
sleep 3

# Verifica che sia in esecuzione senza errori
pm2 status
pm2 logs crm-backend --lines 20
```

Dovresti vedere:
```
✅ Database connected successfully
🚀 Server running on http://localhost:3001
```

### 6. Rebuild Frontend

```bash
cd /var/www/crm-dashboard/vite-version

# Clean rebuild
rm -rf dist node_modules/.vite

# Install dependencies
npm install

# Build
npm run build

# Verifica che il build sia riuscito
ls -lh dist/index.html
ls -lh dist/assets/index-*.js
```

### 7. Restart Nginx (Opzionale)

```bash
nginx -t  # Verifica configurazione
nginx -s reload  # Ricarica configurazione
```

## ✅ Verifica Deployment

### Test 1: Backend API

```bash
# Test endpoint pubblico attivazione (NUOVO)
curl -X POST http://localhost:3001/api/public/verify-username \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'

# Dovrebbe restituire 404 "Username non trovato" (OK) invece di 401
```

### Test 2: Database Migration

```bash
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo -e "
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
  AND TABLE_NAME = 'quotes'
  AND COLUMN_NAME = 'objectives';
"
```

Dovrebbe mostrare:
```
+-----------+-----------+-------------+
| COLUMN_NAME | DATA_TYPE | IS_NULLABLE |
+-----------+-----------+-------------+
| objectives  | text      | YES         |
+-----------+-----------+-------------+
```

### Test 3: Frontend (DA BROWSER)

**IMPORTANTE**: Prima pulisci la cache del browser!

#### Chrome / Edge / Brave:
1. Vai su https://studiomismo.com
2. Premi `F12` → DevTools
3. Click destro su Reload → **"Empty Cache and Hard Reload"**

#### Oppure:
- Mac: `Cmd + Shift + R` (3-4 volte)
- Windows: `Ctrl + Shift + R` (3-4 volte)

#### Verifica Nuovo File JavaScript

DevTools → Network tab → cerca `index-*.js`
Deve avere un timestamp recente (di oggi).

## 🧪 Test Funzionalità

### 1. Test Creazione Preventivo con Pacchetti

1. Login su https://studiomismo.com
2. Vai su **Preventivi** → **Nuovo Preventivo**
3. Verifica ci siano **6 step** (non 4):
   - Step 1: Info Base
   - Step 2: **Obiettivi** ✨ NUOVO
   - Step 3: **Pacchetti** ✨ NUOVO
   - Step 4: Voci
   - Step 5: Sconti
   - Step 6: Riepilogo

4. **Test Step 2 - Obiettivi**:
   - Aggiungi obiettivo: "Aumentare visibilità online"
   - Verifica appaia nella lista
   - Prova a rimuoverlo

5. **Test Step 3 - Pacchetti**:
   - Crea 3 pacchetti (Base €1500, Pro €3000, Premium €5000)
   - Per ogni pacchetto aggiungi 3-4 features:
     - Base: "Logo professionale", "Business card", "2 revisioni"
     - Pro: "Brand guidelines", "Social media kit", "5 revisioni", "Font personalizzato"
     - Premium: "Brand completo", "Kit completo", "Revisioni illimitate", "Consulenza strategica"
   - Marca "Pro" come consigliato
   - Verifica le card colorate

6. **Crea preventivo**:
   - Compila tutto
   - Clicca "Crea Preventivo"
   - Verifica che si salvi senza errori

7. **Verifica in Database**:
```bash
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo -e "
SELECT id, quote_number, title,
       LENGTH(objectives) as obj_length,
       (SELECT COUNT(*) FROM quote_packages WHERE quote_id = quotes.id) as pkg_count
FROM quotes
ORDER BY created_at DESC
LIMIT 1;
"
```

### 2. Test Attivazione Cliente

1. Vai su https://studiomismo.com (logged out)
2. Clicca "Attiva Account Cliente"
3. Inserisci username di test
4. **NON DEVE** dare errore 401 ✅
5. Deve dire "Username non trovato" oppure passare allo step successivo

#### Test con Account Reale (se disponibile):
1. Crea un client access da admin
2. Prova ad attivarlo
3. Inserisci username → codice → password
4. Verifica che l'attivazione completi con successo
5. Verifica che il login funzioni

## 🐛 Troubleshooting

### Problema: Frontend non mostra i nuovi step

**Causa**: Cache browser non pulita

**Soluzione**:
```
1. F12 → Network tab
2. Verifica timestamp di index-*.js
3. Se vecchio → Hard Refresh (Ctrl+Shift+R)
4. Oppure usa Incognito mode per test
```

### Problema: Backend da errore "objectives column not found"

**Causa**: Migration non eseguita

**Soluzione**:
```bash
# Verifica colonna esiste
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo \
  -e "SHOW COLUMNS FROM quotes LIKE 'objectives'"

# Se non esiste, esegui di nuovo la migration (punto 3)
```

### Problema: Attivazione cliente da ancora 401

**Causa**: Codice vecchio o cache

**Soluzione**:
```bash
# Verifica che il file public.routes.js esista
ls -lh /var/www/crm-dashboard/backend/dist/routes/public.routes.js

# Se non esiste, rebuild backend (punto 4)

# Controlla logs per dettagli
pm2 logs crm-backend --err
```

### Problema: "objectives is not defined" nei logs

**Causa**: Prisma client non rigenerato

**Soluzione**:
```bash
cd /var/www/crm-dashboard/backend
npx prisma generate
npx tsc
pm2 restart crm-backend
```

## 📊 Monitoring Post-Deployment

### Logs in Real-Time

```bash
# Segui i logs in tempo reale
pm2 logs crm-backend --lines 0

# Solo errori
pm2 logs crm-backend --err

# Performance
pm2 monit
```

### Verifiche Periodiche

```bash
# Stato servizi
pm2 status

# Riavvio backend se necessario
pm2 restart crm-backend

# Reload nginx se necessario
nginx -s reload
```

## 🎯 Checklist Finale

- [ ] Backup database creato
- [ ] Pull codice da GitHub completato
- [ ] Migration database eseguita con successo
- [ ] Backend ricompilato senza errori
- [ ] PM2 backend riavviato e in running
- [ ] Frontend rebuilded
- [ ] Browser cache pulita
- [ ] Test creazione preventivo con pacchetti: **OK**
- [ ] Test attivazione cliente: **OK**
- [ ] Nessun errore nei logs PM2
- [ ] Nuovo file JS caricato nel browser

## 📝 Note Finali

- Il debug logger rimane attivo su `/api/client-auth/*` per troubleshooting futuro
- Gli endpoint `/api/public/*` sono il workaround definitivo per il 401
- I preventivi vecchi (senza objectives/packages) continuano a funzionare
- I clienti potranno visualizzare i preventivi con la nuova struttura a pacchetti

## 🆘 In Caso di Problemi

Se qualcosa va storto durante il deployment:

```bash
# Rollback database (se necessario)
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo < /root/backup_XXXXXX.sql

# Rollback codice (se necessario)
cd /var/www/crm-dashboard
git reset --hard HEAD~3  # Torna indietro di 3 commit
npm install && npm run build  # Rebuild
pm2 restart crm-backend
```

Poi contattami con:
- Errori esatti dai logs: `pm2 logs crm-backend --lines 50`
- Errori dal browser (F12 → Console)
- Output dei comandi di verifica
