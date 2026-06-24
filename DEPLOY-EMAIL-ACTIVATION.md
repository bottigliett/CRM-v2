# 🚀 Deployment Sistema Attivazione Email

## 📋 Cosa Include Questo Deployment

### ✨ Sistema Invio Codice via Email
- Codice a 6 cifre generato automaticamente
- Inviato all'email del cliente
- Valido per 15 minuti
- Possibilità di re-inviare il codice
- Template email professionale già esistente

### 🔄 Nuovo Flusso Attivazione Cliente
1. **Step 1**: Inserisci username
2. **Step 2**: Modifica email (se necessario) → Click "Invia Codice via Email"
3. **Step 2b**: Inserisci codice a 6 cifre ricevuto via email
4. **Step 3**: Crea password
5. **Success**: Login automatico e redirect a dashboard

## 🔧 Deployment su Produzione

```bash
# ============================================
# DEPLOYMENT COMPLETO
# ============================================

# 1. Connetti al server
ssh root@185.229.236.196
# Password: ceE2DS43PK

cd /var/www/crm-dashboard

# 2. Pull ultimo codice
git pull origin main
git log --oneline -3

# Dovresti vedere:
# f1393ae Implement email-based activation code system
# fd1d67f Add email edit and dashboard activation dialog
# e17d034 Complete refactor: fix redirects and client activation

# 3. BACKEND - Rebuild
cd backend

# Install dependencies (se necessario)
npm install

# Generate Prisma client
npx prisma generate

# Compile TypeScript
npx tsc

# Verifica che i nuovi file siano compilati
ls -lh dist/routes/activate.routes.js
ls -lh dist/services/email.service.js

# Restart backend
pm2 restart crm-backend

# Wait for startup
sleep 5

# Check logs
pm2 logs crm-backend --lines 20

# 4. VERIFICA CONFIGURAZIONE EMAIL
# Assicurati che MAIL_PASSWORD sia configurata nel .env
cat .env | grep MAIL_PASSWORD

# Se non è configurata, aggiungila:
# echo 'MAIL_PASSWORD=<password_hostinger>' >> .env
# pm2 restart crm-backend

# 5. FRONTEND - Rebuild
cd /var/www/crm-dashboard/vite-version

# Clean rebuild
rm -rf dist node_modules/.vite

# Install and build
npm install
npm run build

# Verify build
ls -lh dist/assets/index-*.js

echo "=== DEPLOYMENT COMPLETATO ==="
```

## 🧪 Test Sistema Email

### Test 1: Endpoint Backend

```bash
# Test send-code endpoint
curl -X POST http://localhost:3001/api/activate/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_username",
    "email": "test@email.com"
  }'

# Dovrebbe restituire:
# {"success":true,"message":"Codice inviato a test@email.com"}
# (o errore 404 se username non esiste)
```

### Test 2: Flusso Completo da Browser

1. **Vai su** `https://studiomismo.com/client/activate`

2. **Step 1 - Username**:
   - Inserisci username di un cliente non ancora attivato
   - Click "Continua"
   - ✅ Deve passare allo step 2

3. **Step 2 - Email**:
   - Verifica che l'email sia corretta (modificala se necessario)
   - Click "Invia Codice via Email"
   - ✅ Deve mostrare toast "Codice inviato a..."
   - ✅ Deve apparire il campo per inserire il codice

4. **Controlla Email**:
   - Apri la casella email del cliente
   - ✅ Deve esserci un'email da "Studio Mismo CRM <noreply@studiomismo.it>"
   - ✅ Oggetto: "Codice di Verifica - Studio Mismo"
   - ✅ Codice a 6 cifre in grande e ben visibile
   - ✅ Messaggio: "Il codice è valido per 15 minuti"

5. **Step 2b - Codice**:
   - Inserisci il codice a 6 cifre
   - Click "Verifica Codice"
   - ✅ Deve passare allo step 3

6. **Step 3 - Password**:
   - Crea una password (min 8 caratteri)
   - Conferma password
   - Click "Completa Attivazione"
   - ✅ Deve completare l'attivazione
   - ✅ Redirect automatico a dashboard cliente

7. **Test Re-invio Codice**:
   - Torna allo step 2 (crea un altro cliente per test)
   - Invia codice
   - Click "Invia nuovo codice" dopo qualche secondo
   - ✅ Deve inviare un NUOVO codice
   - ✅ Il vecchio codice non deve più funzionare

8. **Test Scadenza Codice**:
   - Invia codice
   - Aspetta 16 minuti
   - Prova a verificare il codice
   - ✅ Deve dare errore "Codice di attivazione scaduto"

## 📧 Configurazione Email

### Verifica Configurazione Hostinger

```bash
cd /var/www/crm-dashboard/backend
cat .env | grep -i mail

# Deve mostrare:
# MAIL_PASSWORD=<password>
```

### Test Manuale Invio Email

```bash
# Test script (opzionale)
cd /var/www/crm-dashboard/backend
node dist/scripts/test-email.js
```

## 🐛 Troubleshooting

### Problema: Email non arriva

**Verifica 1**: Check configurazione email
```bash
cd /var/www/crm-dashboard/backend
grep MAIL_PASSWORD .env
```

**Verifica 2**: Check logs backend
```bash
pm2 logs crm-backend | grep -i email
```

**Verifica 3**: Test SMTP manualmente
```bash
telnet smtp.hostinger.com 587
# Dovresti vedere: 220 smtp.hostinger.com ESMTP
```

### Problema: Codice non valido

**Causa**: Il codice potrebbe essere scaduto (15 minuti)

**Soluzione**: Click "Invia nuovo codice"

### Problema: "Nessun codice di attivazione generato"

**Causa**: Non è stato cliccato "Invia Codice via Email"

**Soluzione**: Torna allo step 2 e invia il codice

### Problema: Frontend mostra ancora vecchia UI

**Causa**: Cache browser

**Soluzione**:
```
1. F12 → DevTools
2. Network tab
3. Hard Refresh: Ctrl+Shift+R (3-4 volte)
4. O usa Incognito mode
```

## ✅ Checklist Post-Deployment

- [ ] Backend riavviato senza errori
- [ ] Frontend ribuilded
- [ ] Browser cache pulita
- [ ] Test invio email: OK
- [ ] Test verifica codice: OK
- [ ] Test scadenza codice: OK
- [ ] Test re-invio codice: OK
- [ ] Test flusso completo attivazione: OK
- [ ] Email arriva in inbox (non spam): OK

## 📝 Note Importanti

### Codice di Attivazione
- **Formato**: 6 cifre numeriche (es. 123456)
- **Validità**: 15 minuti dall'invio
- **Storage**: Salvato in `activationToken` come JSON: `{"code": "123456", "expiresAt": "2024-..."}`
- **Retrocompatibilità**: Supporta anche vecchi token stringa semplice

### Email Template
- **Da**: Studio Mismo CRM <noreply@studiomismo.it>
- **Oggetto**: Codice di Verifica - Studio Mismo
- **Stile**: Professionale con codice in grande e ben visibile
- **Contenuto**: Template HTML già esistente in `email.service.ts`

### Sicurezza
- Codice random a 6 cifre (1.000.000 combinazioni)
- Scadenza automatica dopo 15 minuti
- Un nuovo codice invalida il precedente
- Controllo backend per verificare scadenza

## 🎯 Vantaggi del Nuovo Sistema

1. **Verifica Email Funzionante**
   - Ogni attivazione testa che l'email arrivi
   - Sicuro che future notifiche arriveranno

2. **Migliore Sicurezza**
   - Codice temporaneo invece di token statico
   - Scade automaticamente
   - Re-invio invalida il vecchio

3. **Migliore UX**
   - Cliente controlla subito la sua email
   - Processo più chiaro e professionale
   - Possibilità di modificare email se sbagliata

4. **Testing Email**
   - Ogni attivazione cliente = test email
   - Individua problemi SMTP immediatamente
   - Feedback immediato se email non arriva

## 🆘 Support

In caso di problemi:

1. **Check backend logs**:
   ```bash
   pm2 logs crm-backend --lines 50 | grep -i email
   ```

2. **Check database**:
   ```bash
   mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo -e "
   SELECT username, activationToken, emailVerified
   FROM client_access
   WHERE username = 'test_username';
   "
   ```

3. **Test endpoint direttamente**:
   ```bash
   curl -X POST https://studiomismo.com/api/activate/send-code \
     -H "Content-Type: application/json" \
     -d '{"username":"USERNAME","email":"EMAIL"}'
   ```

---

**Deployment preparato**: 2026-01-16
**Commit**: f1393ae
**Sistema**: Email-based Activation Code
