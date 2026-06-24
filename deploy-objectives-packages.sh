#!/bin/bash
# Deploy objectives and packages feature to production
# This script deploys the new quote creation system with objectives and packages

echo "=========================================="
echo "🚀 DEPLOYMENT: Objectives & Packages"
echo "=========================================="
echo ""

# Connect to server and execute deployment
ssh root@185.229.236.196 << 'ENDSSH'

set -e  # Exit on any error

cd /var/www/crm-dashboard

echo "1. Verifica commit corrente:"
git log --oneline -1

echo ""
echo "2. Pull ultimo codice da GitHub:"
git restore .
git pull origin main

echo ""
echo "3. Verifica nuovo commit:"
git log --oneline -1

echo ""
echo "4. Esegui migration database:"
mysql -u u706045794_mismo_crm_new -p'BLQ$>:;*9+h' u706045794_crm_mismo << 'EOSQL'

-- Add objectives field to quotes table
ALTER TABLE quotes
ADD COLUMN objectives TEXT NULL COMMENT 'JSON array of project objectives' AFTER description;

-- Add features field to quote_packages table
ALTER TABLE quote_packages
ADD COLUMN features TEXT NULL COMMENT 'JSON array of package features' AFTER description;

-- Verify changes
SELECT 'quotes.objectives column:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
  AND TABLE_NAME = 'quotes'
  AND COLUMN_NAME = 'objectives';

SELECT 'quote_packages.features column:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
  AND TABLE_NAME = 'quote_packages'
  AND COLUMN_NAME = 'features';

EOSQL

echo ""
echo "5. Rebuild backend:"
cd /var/www/crm-dashboard/backend
npm install
npx prisma generate
npx tsc

echo ""
echo "6. Restart backend:"
pm2 restart crm-backend

echo ""
echo "7. Clean rebuild frontend:"
cd /var/www/crm-dashboard/vite-version
rm -rf dist node_modules/.vite
npm install
npm run build

echo ""
echo "8. Verifica che il nuovo codice sia presente:"
echo "Cerca 'objectives' nel backend compilato:"
grep -n "objectives" /var/www/crm-dashboard/backend/dist/controllers/quote.controller.js | head -3

echo ""
echo "Cerca 'Obiettivi' nel frontend buildato:"
cd dist/assets
MAIN_JS=$(ls -t index-*.js | head -1)
echo "File principale: $MAIN_JS"
grep -o "Obiettivi" $MAIN_JS | head -1

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETATO!"
echo "=========================================="
echo ""
echo "IMPORTANTE: Pulisci cache browser!"
echo "Chrome/Edge: F12 > Click destro su Reload > Empty Cache and Hard Reload"
echo "Oppure: Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)"

ENDSSH

echo ""
echo "Deployment script terminato."
