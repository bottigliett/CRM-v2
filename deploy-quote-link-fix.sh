#!/bin/bash

# ============================================
# DEPLOYMENT: LinkedQuoteId Update Fix
# ============================================

echo "🚀 Deploying quote link fix to production..."
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

echo "🔍 Verifying latest commits..."
git log --oneline -4

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
echo "✅ DEPLOYMENT COMPLETATO!"
ENDSSH

echo ""
echo -e "${GREEN}🎉 Deployment completato con successo!${NC}"
echo ""
echo "📝 Come testare:"
echo ""
echo "  ${YELLOW}Metodo 1: Cliente esistente con preventivo${NC}"
echo "  1. Vai alla pagina del cliente (es. Mario Rossi SRL)"
echo "  2. Tab 'Preventivi'"
echo "  3. Clicca 'Mostra al Cliente' sul preventivo Q2026-0006"
echo "  4. ✅ Il preventivo viene collegato"
echo "  5. ✅ Lo stato cambia da DRAFT a SENT"
echo "  6. Login come cliente → ✅ Vedi il preventivo"
echo ""
echo "  ${YELLOW}Metodo 2: Nuovo preventivo${NC}"
echo "  1. Crea un nuovo preventivo per un contatto con ClientAccess QUOTE_ONLY"
echo "  2. ✅ Auto-collegato al ClientAccess"
echo "  3. ✅ Cliente vede il preventivo immediatamente"
echo ""
