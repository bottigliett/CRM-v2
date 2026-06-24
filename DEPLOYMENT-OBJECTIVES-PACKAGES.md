# 🚀 Deployment: Sistema Preventivi con Obiettivi e Pacchetti

## ✅ Modifiche Implementate

### Database Schema:
1. **Aggiunto campo `objectives` alla tabella `quotes`**
   - Tipo: TEXT (JSON array)
   - Contenuto: `[{title: string, description: string}]`

2. **Aggiunto campo `features` alla tabella `quote_packages`**
   - Tipo: TEXT (JSON array)
   - Contenuto: `["Feature 1", "Feature 2", ...]`

### Backend API:
- `createQuote` ora accetta e salva objectives e package features
- `updateQuote` supporta la modifica di objectives e features
- Validation: deve esserci almeno un pacchetto O almeno una voce

### Frontend UI:
Nuovo wizard a 6 step:
- **Step 1**: Info Base (contatto, titolo, descrizione)
- **Step 2**: Obiettivi del Progetto *(nuovo)*
- **Step 3**: Pacchetti Proposti *(nuovo)*
- **Step 4**: Voci Singole (opzionale)
- **Step 5**: Sconti e IVA
- **Step 6**: Riepilogo

## 📋 Procedura di Deployment

### 1. Connettiti al Server

```bash
ssh root@185.229.236.196
# Password: ceE2DS43PK
```

### 2. Naviga nella Directory del Progetto

```bash
cd /var/www/crm-dashboard
```

### 3. Pull Ultimo Codice da GitHub

```bash
git restore .
git pull origin main
git log --oneline -3
```

Verifica che l'ultimo commit sia:
```
6844bda Implement 6-step quote creation with objectives and packages
07a74f3 Add support for quote objectives and package features
44518b0 Update quote API interfaces for objectives and package features
```

### 4. Esegui Migration Database

```bash
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo
```

Poi esegui questo SQL:

```sql
-- Add objectives field to quotes table
ALTER TABLE quotes
ADD COLUMN objectives TEXT NULL COMMENT 'JSON array of project objectives'
AFTER description;

-- Add features field to quote_packages table
ALTER TABLE quote_packages
ADD COLUMN features TEXT NULL COMMENT 'JSON array of package features'
AFTER description;

-- Verify changes
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
  AND TABLE_NAME = 'quotes'
  AND COLUMN_NAME = 'objectives';

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
  AND TABLE_NAME = 'quote_packages'
  AND COLUMN_NAME = 'features';

-- Exit MySQL
exit;
```

### 5. Rebuild Backend

```bash
cd /var/www/crm-dashboard/backend
npm install
npx prisma generate
npx tsc
```

### 6. Restart Backend

```bash
pm2 restart crm-backend
pm2 logs crm-backend --lines 20
```

Verifica che non ci siano errori nei log.

### 7. Rebuild Frontend

```bash
cd /var/www/crm-dashboard/vite-version
rm -rf dist node_modules/.vite
npm install
npm run build
```

### 8. Verifica Deployment

```bash
# Verifica backend compilato
grep -n "objectives" /var/www/crm-dashboard/backend/dist/controllers/quote.controller.js | head -3

# Verifica frontend buildato
cd /var/www/crm-dashboard/vite-version/dist/assets
ls -lh index-*.js
MAIN_JS=$(ls -t index-*.js | head -1)
echo "File principale: $MAIN_JS"
grep -o "Obiettivi" $MAIN_JS | head -1
grep -o "Pacchetti" $MAIN_JS | head -1
```

## 🌐 Test Post-Deployment

### 1. Clear Browser Cache

**MOLTO IMPORTANTE:** Il browser deve scaricare i nuovi file JavaScript!

#### Chrome / Edge / Brave:
1. Vai su https://studiomismo.com
2. Premi `F12` per aprire DevTools
3. Click **destro** sul pulsante ricarica
4. Seleziona **"Empty Cache and Hard Reload"**

#### Oppure usa scorciatoia:
- **Mac**: `Cmd + Shift + R` (premi 3-4 volte)
- **Windows/Linux**: `Ctrl + Shift + R` (premi 3-4 volte)

### 2. Test Creazione Preventivo

1. Login su https://studiomismo.com
2. Vai su **Preventivi** → **Nuovo Preventivo**
3. Verifica che ci siano **6 step** (non più 4):
   - Step 1: Info Base
   - Step 2: **Obiettivi** ✨ NUOVO
   - Step 3: **Pacchetti** ✨ NUOVO
   - Step 4: Voci
   - Step 5: Sconti
   - Step 6: Riepilogo

4. **Test Step 2 - Obiettivi**:
   - Aggiungi un obiettivo (es. "Aumentare visibilità online")
   - Verifica che appaia nella lista
   - Prova a rimuoverlo

5. **Test Step 3 - Pacchetti**:
   - Crea 3 pacchetti (es. Base, Pro, Premium)
   - Aggiungi features a ciascuno
   - Marca uno come "Consigliato"
   - Verifica che appaiano con le card colorate

6. **Test Creazione Completa**:
   - Compila tutti i campi
   - Crea un preventivo con almeno 2 pacchetti
   - Verifica che non ci siano errori
   - Controlla che il preventivo sia salvato nel database

### 3. Verifica Database

```bash
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo
```

```sql
-- Trova l'ultimo preventivo creato
SELECT id, quote_number, title, objectives
FROM quotes
ORDER BY created_at DESC
LIMIT 1;

-- Verifica i pacchetti del preventivo
SELECT id, quote_id, name, features, price
FROM quote_packages
WHERE quote_id = (SELECT id FROM quotes ORDER BY created_at DESC LIMIT 1);
```

## 🐛 Troubleshooting

### Problema: Non vedo i nuovi step

**Causa**: Browser cache non pulita

**Soluzione**:
1. Apri DevTools (F12) → tab **Network**
2. Cerca i file `index-*.js`
3. Verifica che il timestamp sia recente
4. Se no, ripeti hard refresh (Ctrl+Shift+R)

### Problema: Errore "objectives is not defined" durante creazione

**Causa**: Migration non eseguita o backend non riavviato

**Soluzione**:
```bash
# Verifica che la colonna esista
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' -e "SHOW COLUMNS FROM u706045794_crm_mismo.quotes LIKE 'objectives'"

# Se non esiste, esegui la migration (punto 4)
# Se esiste, riavvia backend
pm2 restart crm-backend
```

### Problema: Errore durante creazione preventivo

**Causa**: Validazione fallita

**Soluzione**:
- Verifica di aver aggiunto almeno UN pacchetto O almeno UNA voce
- Controlla i log backend: `pm2 logs crm-backend`
- Controlla la console browser (F12 → Console)

## 📝 Note Tecniche

### Compatibilità con Preventivi Esistenti

I preventivi già creati **NON** avranno objectives o packages, ma continueranno a funzionare normalmente:
- `objectives` sarà `NULL` → frontend lo tratta come array vuoto `[]`
- I pacchetti esistenti senza `features` → frontend lo tratta come array vuoto `[]`

### Struttura Dati JSON

**Objectives**:
```json
[
  {
    "title": "Aumentare la visibilità online",
    "description": "Creare una presenza digitale forte..."
  },
  {
    "title": "Migliorare l'immagine del brand",
    "description": "Rinnovare l'identità visiva..."
  }
]
```

**Package Features**:
```json
[
  "Logo professionale",
  "Brand guidelines",
  "Business card design",
  "3 revisioni incluse"
]
```

## ✅ Checklist Post-Deployment

- [ ] Migration database eseguita correttamente
- [ ] Backend ricompilato e riavviato
- [ ] Frontend ribuildata
- [ ] Browser cache pulita
- [ ] Creato preventivo di test con obiettivi e pacchetti
- [ ] Verificato che il preventivo appaia correttamente nel database
- [ ] Testato sistema di attivazione cliente (se fixato)
