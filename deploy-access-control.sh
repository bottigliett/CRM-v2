#!/bin/bash

# ============================================
# DEPLOYMENT: Access Control & Quote Visibility
# ============================================

echo "🚀 Deploying access control and quote visibility fixes to production..."
echo ""

# Server credentials
SERVER="root@185.229.236.196"
PASSWORD="ceE2DS43PK"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📡 Connecting to server...${NC}"

# Deploy command
ssh "$SERVER" << 'ENDSSH'
cd /var/www/crm-dashboard

echo "📥 Pulling latest code..."
git pull origin main

echo "🔍 Verifying latest commits..."
git log --oneline -3

echo ""
echo "=== BACKEND DEPLOYMENT ==="

cd backend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "⚙️  Compiling TypeScript..."
npx tsc

echo "🔄 Restarting backend..."
pm2 restart crm-backend

echo "⏳ Waiting for backend to start..."
sleep 5

echo "📋 Checking backend logs..."
pm2 logs crm-backend --lines 15 --nostream

echo ""
echo "=== FRONTEND DEPLOYMENT ==="

cd /var/www/crm-dashboard/vite-version

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building frontend..."
npm run build

echo "📋 Verifying build..."
ls -lh dist/assets/index-*.js | head -3

echo ""
echo "✅ DEPLOYMENT COMPLETATO!"
ENDSSH

echo ""
echo -e "${GREEN}🎉 Deployment completato con successo!${NC}"
echo ""
echo "📝 Test checklist:"
echo ""
echo "  ${YELLOW}Test 1: Access Control per QUOTE_ONLY${NC}"
echo "  1. Login con un cliente QUOTE_ONLY"
echo "  2. ✅ Deve vedere solo 'Preventivi' nella sidebar"
echo "  3. ✅ Tentando di accedere a /client/dashboard deve reindirizzare a /client/quotes"
echo ""
echo "  ${YELLOW}Test 2: Quote Auto-Link${NC}"
echo "  1. Crea un nuovo preventivo per un contatto con ClientAccess QUOTE_ONLY"
echo "  2. ✅ Il preventivo deve essere automaticamente collegato (linkedQuoteId)"
echo "  3. ✅ Il cliente vede il preventivo nella sua pagina /client/quotes"
echo ""
echo "  ${YELLOW}Test 3: FULL_CLIENT Access${NC}"
echo "  1. Login con un cliente FULL_CLIENT"
echo "  2. ✅ Deve vedere tutti i menu (Dashboard, Preventivi, Fatture, etc.)"
echo "  3. ✅ Può accedere a tutte le pagine senza reindirizzamenti"
echo ""
