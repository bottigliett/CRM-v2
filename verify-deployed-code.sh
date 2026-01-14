#!/bin/bash
# Verifica che il nuovo codice sia deployato correttamente

echo "=========================================="
echo "Verifica Codice Deployato su Server"
echo "=========================================="
echo ""

ssh root@185.229.236.196 << 'ENDSSH'

echo "1. Verifica commit Git:"
cd /var/www/crm-dashboard
git log --oneline -1

echo ""
echo "2. Verifica file JavaScript buildato contiene itemName:"
cd vite-version/dist/assets
MAIN_JS=$(ls -t index-*.js | head -1)
echo "File principale: $MAIN_JS"
echo "Cerca 'itemName' nel file:"
grep -o "itemName" $MAIN_JS | head -5

echo ""
echo "3. Verifica che index.html punti al file corretto:"
cd /var/www/crm-dashboard/vite-version/dist
grep -o "index-[^\"]*\.js" index.html | head -1

echo ""
echo "4. Timestamp ultimo build:"
ls -lh /var/www/crm-dashboard/vite-version/dist/index.html

echo ""
echo "5. Verifica URL client-auth nel JavaScript:"
cd /var/www/crm-dashboard/vite-version/dist/assets
grep -o "/client-auth/verify-username" $MAIN_JS | head -1

ENDSSH
