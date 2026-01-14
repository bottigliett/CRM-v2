#!/bin/bash
# Deploy the itemName fix to production server

echo "=========================================="
echo "🚀 DEPLOYMENT: Fix itemName e IVA 0%"
echo "=========================================="
echo ""

# Connect to server and execute deployment
ssh root@185.229.236.196 << 'ENDSSH'

set -e  # Exit on any error

cd /var/www/crm-dashboard

echo "1. Verifica commit corrente:"
git log --oneline -1

echo ""
echo "2. Verifica stato git (deve essere pulito):"
git status

echo ""
echo "3. Ripristina eventuali modifiche locali:"
git restore .

echo ""
echo "4. Pull ultimo codice da GitHub:"
git pull origin main

echo ""
echo "5. Verifica nuovo commit:"
git log --oneline -1

echo ""
echo "6. VERIFICA CRITICA - page.tsx deve avere itemName:"
cd vite-version/src/app/quotes/create
grep -n "itemName:" page.tsx | head -3
if [ $? -eq 0 ]; then
  echo "✅ itemName trovato in page.tsx!"
else
  echo "❌ ERRORE: itemName NON trovato in page.tsx!"
  exit 1
fi

echo ""
echo "7. Rebuild backend:"
cd /var/www/crm-dashboard/backend
npm install
npx prisma generate
npx tsc

echo ""
echo "8. Restart backend:"
pm2 restart crm-backend

echo ""
echo "9. Clean rebuild frontend:"
cd /var/www/crm-dashboard/vite-version
rm -rf dist node_modules/.vite
npm install
npm run build

echo ""
echo "10. Verifica file JavaScript contiene itemName:"
cd dist/assets
MAIN_JS=$(ls -t index-*.js | head -1)
echo "File principale: $MAIN_JS"
ITEMNAME_COUNT=$(grep -o "itemName" $MAIN_JS | wc -l)
echo "Occorrenze di 'itemName': $ITEMNAME_COUNT"

if [ $ITEMNAME_COUNT -gt 0 ]; then
  echo "✅ BUILD SUCCESSO - itemName presente nel JavaScript!"
else
  echo "❌ ERRORE - itemName NON presente nel JavaScript buildato!"
  exit 1
fi

echo ""
echo "11. Verifica taxRate = 0 nel backend compilato:"
cd /var/www/crm-dashboard/backend/dist/controllers
grep -n "taxRate = 0" quote.controller.js | head -1

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETATO!"
echo "=========================================="
echo ""
echo "Nuovo file JS: $MAIN_JS"
echo ""
echo "⚠️  IMPORTANTE: Pulisci cache browser!"
echo "Chrome/Edge: F12 > Click destro su Reload > Empty Cache and Hard Reload"
echo "Oppure: Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)"

ENDSSH

echo ""
echo "Deployment script terminato."
