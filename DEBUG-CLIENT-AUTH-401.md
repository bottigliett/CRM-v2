# 🐛 Debug: Errore 401 su Client Activation

## Problema

L'endpoint `/api/client-auth/verify-username` restituisce errore 401 "Token non fornito" anche se è configurato come route pubblica senza middleware di autenticazione.

## Setup Debug Logging

Ho aggiunto un middleware di debug che logga tutti i dettagli delle richieste alle routes `/api/client-auth/*`. Questo ci aiuterà a capire esattamente cosa sta succedendo.

## Procedura di Debug

### 1. Deploy del Codice con Debug Logger

```bash
ssh root@185.229.236.196
# Password: ceE2DS43PK
```

```bash
cd /var/www/crm-dashboard

# Pull ultimo codice
git pull origin main

# Verifica che l'ultimo commit sia il debug logger
git log --oneline -1
# Deve mostrare: 67c65f0 Add debug logging to client-auth routes

# Rebuild backend
cd backend
npm install
npx tsc

# Restart backend
pm2 restart crm-backend
```

### 2. Test Endpoint e Lettura Logs

#### Opzione A: Test con curl dal server

```bash
# Test dalla linea di comando del server
curl -X POST http://localhost:3001/api/client-auth/verify-username \
  -H "Content-Type: application/json" \
  -d '{"username":"test_username"}'

# Guarda i logs immediatamente dopo
pm2 logs crm-backend --lines 50
```

#### Opzione B: Test dal browser (studiomismo.com)

1. Vai su https://studiomismo.com
2. Apri la pagina di attivazione cliente
3. Inserisci un username e clicca "Verifica"

Poi sul server:
```bash
pm2 logs crm-backend --lines 50
```

### 3. Analizza i Logs

Il debug logger mostrerà:
```
================================================================================
[DEBUG] 2026-01-15T...
[DEBUG] POST /verify-username
[DEBUG] Full URL: http://...
[DEBUG] Headers: {
  "authorization": "Bearer ...",  <-- Questa dovrebbe essere ASSENTE
  "content-type": "application/json",
  ...
}
[DEBUG] Body: {
  "username": "..."
}
================================================================================
```

### Cosa cercare:

1. **Header Authorization presente?**
   - ❌ Se presente → Qualcosa sta aggiungendo il token (nginx? frontend?)
   - ✅ Se assente → Ok, il problema è altrove

2. **Path corretto?**
   - Deve essere `/verify-username`
   - Non `/api/client-auth/verify-username` (quello viene montato da Express)

3. **Errore dopo i logs?**
   - Cercare "Token non fornito" nei logs successivi
   - Capire quale middleware viene chiamato

## Possibili Cause

### 1. Nginx aggiunge header Authorization
Se nginx è configurato per fare proxy_pass e aggiunge header automaticamente:

```nginx
# Controlla configurazione nginx
cat /etc/nginx/sites-available/crm-dashboard

# Cerca direttive tipo:
# proxy_set_header Authorization ...
```

### 2. Frontend aggiunge token automaticamente
Il file `client-auth-api.ts` usa `fetch()` direttamente, ma verifica che non ci siano interceptors globali.

### 3. Express routing problem
Forse c'è un problema con l'ordine di mounting delle routes in `app.ts`.

### 4. Middleware nascosto
Potrebbe esserci un middleware globale che non abbiamo trovato.

## Comandi Utili

```bash
# Vedere logs in tempo reale
pm2 logs crm-backend --lines 0

# Filtrare solo errori
pm2 logs crm-backend --err

# Vedere tutte le route registrate (aggiungi al server.ts)
# In Express non c'è un modo built-in, ma possiamo loggare app._router.stack

# Verificare che il processo stia usando il codice giusto
ps aux | grep node
ls -lh /var/www/crm-dashboard/backend/dist/middleware/debug-logger.js
```

## Se il Problema Persiste

Se anche con i logs dettagliati non troviamo la causa, possiamo:

1. **Bypass temporaneo**: Creare un endpoint duplicato senza middleware
2. **Test diretto**: Creare un file test.js che chiama direttamente il controller
3. **Revisione completa**: Rivedere ogni file che tocca le routes

## Alternative Implementative

Se non riusciamo a fixare il 401, possiamo cambiare approccio:

### Opzione 1: Rendere public tutto /client-auth/*
Modificare il middleware per ignorare certe routes:

```typescript
// In client-auth middleware
if (req.path.startsWith('/verify-')) {
  return next(); // Skip auth for verify-* routes
}
```

### Opzione 2: Nuovo endpoint separato
Creare `/api/public/verify-username` completamente separato:

```typescript
// In app.ts
import { verifyUsername } from './controllers/client-auth.controller';
app.post('/api/public/verify-username', verifyUsername);
```

### Opzione 3: Usare query parameter invece di header
Modificare il flow per non usare JWT fino al login effettivo.

## Prossimi Passi

1. ✅ Deploy codice con debug logger
2. ⏳ Test endpoint e lettura logs
3. ⏳ Identificare causa del 401
4. ⏳ Applicare fix appropriato
5. ⏳ Testare flusso completo di attivazione

---

**Note**: Una volta identificata la causa, rimuoveremo il debug logger per non inquinare i logs in produzione.
