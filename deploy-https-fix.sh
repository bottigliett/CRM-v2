#!/bin/bash
# Fix HTTPS Mixed Content - Deploy Script
# Risolve: "Mixed Content: blocked insecure resource http://136.144.236.160/api"

set -e

echo "=========================================="
echo "Fix HTTPS Mixed Content"
echo "=========================================="
echo ""

cd /var/www/CRM-v2

# Step 1: Pull latest code
echo "Step 1/6: Pull latest code..."
git pull origin main
echo "✓ Code updated"
echo ""

# Step 2: Ensure no VITE_API_URL is set (use relative /api path)
echo "Step 2/6: Checking frontend env..."
if [ -f vite-version/.env ] && grep -q "VITE_API_URL" vite-version/.env; then
    echo "⚠ Removing VITE_API_URL from .env (will use relative /api path via nginx proxy)"
    sed -i '/VITE_API_URL/d' vite-version/.env
fi
if [ -f vite-version/.env.production ] && grep -q "VITE_API_URL" vite-version/.env.production; then
    echo "⚠ Removing VITE_API_URL from .env.production"
    sed -i '/VITE_API_URL/d' vite-version/.env.production
fi
echo "✓ No VITE_API_URL set - frontend will use relative /api path"
echo ""

# Step 3: Rebuild frontend
echo "Step 3/6: Rebuilding frontend..."
cd vite-version
npm install
npm run build
echo "✓ Frontend rebuilt"
echo ""

# Step 4: Install SSL certificate (if not already done)
echo "Step 4/6: Checking SSL certificate..."
cd /var/www/CRM-v2
if [ ! -d "/etc/letsencrypt/live/areariservata-tecno.online" ]; then
    echo "⚠ SSL certificate not found, installing with certbot..."
    sudo certbot --nginx -d areariservata-tecno.online --non-interactive --agree-tos --email admin@areariservata-tecno.online
    echo "✓ SSL certificate installed"
else
    echo "✓ SSL certificate already exists"
fi
echo ""

# Step 5: Update nginx config
echo "Step 5/6: Updating nginx config..."
sudo cp nginx-crm.conf /etc/nginx/sites-available/areariservata-tecno.online
sudo ln -sf /etc/nginx/sites-available/areariservata-tecno.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
echo "✓ Nginx updated and reloaded"
echo ""

# Step 6: Verify
echo "Step 6/6: Verifying..."
echo "Testing HTTPS..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://areariservata-tecno.online/ 2>/dev/null || echo "FAILED")
echo "HTTPS response: $HTTP_CODE"
echo ""
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://areariservata-tecno.online/api/health 2>/dev/null || echo "FAILED")
echo "API response: $API_CODE"
echo ""

echo "=========================================="
echo "✅ Fix completato!"
echo "=========================================="
echo ""
echo "Ora il frontend farà le chiamate API tramite:"
echo "  https://areariservata-tecno.online/api/* -> proxy -> localhost:3001"
echo ""
echo "Fai un hard refresh nel browser: Cmd+Shift+R"
echo ""
