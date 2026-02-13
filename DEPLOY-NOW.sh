#!/bin/bash
# Quick deployment command - Run this on your LOCAL machine

echo "Connecting to server and running deployment..."
echo ""

ssh root@185.229.236.196 << 'ENDSSH'
cd /var/www/crm-dashboard
git pull origin main
chmod +x deploy-complete.sh
./deploy-complete.sh
ENDSSH

echo ""
echo "=========================================="
echo "Deployment script executed!"
echo "=========================================="
echo ""
echo "Now open https://studiomismo.com in your browser and:"
echo "1. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)"
echo "2. Or open DevTools (F12) > Network tab > check 'Disable cache'"
echo "3. Test:"
echo "   - Create a quote (should work without itemName error)"
echo "   - Check IVA default (should be 0% not 22%)"
echo "   - Activate client account (should work without 401 error)"
echo ""
