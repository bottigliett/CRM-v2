#!/bin/bash

# ============================================
# DEPLOYMENT COMPLETO - Tutti i Fix
# ============================================

echo "🚀 Deploying all fixes to production..."
echo ""
echo "Fixes included:"
echo "  ✅ Email activation system"
echo "  ✅ Client access control (QUOTE_ONLY vs FULL_CLIENT)"
echo "  ✅ Quote auto-linking"
echo "  ✅ LinkedQuoteId update support"
echo "  ✅ Quote status auto-change (DRAFT → SENT)"
echo "  ✅ Client login endpoint fix"
echo "  ✅ Client login response format fix"
echo ""

# Server credentials
SERVER="root@185.229.236.196"

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

echo ""
echo "🔍 Latest commits:"
git log --oneline -6

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
pm2 logs crm-backend --lines 20 --nostream

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
echo "📝 Test completo da fare:"
echo ""
echo "  ${YELLOW}1. Sistema Attivazione Email${NC}"
echo "  • Vai su https://studiomismo.com/client/activate"
echo "  • Step 1: Username → Step 2: Invia codice via email"
echo "  • Step 2b: Verifica codice → Step 3: Password → Login automatico"
echo ""
echo "  ${YELLOW}2. Access Control${NC}"
echo "  • Login con cliente QUOTE_ONLY → vedi solo 'Preventivi'"
echo "  • Login con cliente FULL_CLIENT → vedi tutti i menu"
echo ""
echo "  ${YELLOW}3. Preventivi${NC}"
echo "  • Admin: Click 'Mostra al Cliente' su preventivo"
echo "  • ✅ Preventivo collegato al cliente"
echo "  • ✅ Stato cambia DRAFT → SENT"
echo "  • Cliente: Vede il preventivo in /client/quotes"
echo ""
echo "  ${YELLOW}4. Login Cliente${NC}"
echo "  • https://studiomismo.com/client/login"
echo "  • Inserisci credenziali → ✅ Login funziona"
echo "  • ✅ Reindirizzamento corretto in base a accessType"
echo ""
