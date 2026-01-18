#!/bin/bash

# ============================================
# DEPLOYMENT: Activation Completion Fix
# ============================================

echo "🚀 Deploying activation completion fix to production..."
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

echo "🔍 Verifying latest commit..."
git log --oneline -3

cd backend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "⚙️  Compiling TypeScript..."
npx tsc

echo "🔄 Restarting backend..."
pm2 restart crm-backend

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo "📋 Checking backend logs..."
pm2 logs crm-backend --lines 15 --nostream

echo ""
echo "✅ DEPLOYMENT COMPLETATO!"
ENDSSH

echo ""
echo -e "${GREEN}🎉 Deployment completato con successo!${NC}"
echo ""
echo "📝 Test checklist:"
echo "  1. Vai su https://studiomismo.com/client/activate"
echo "  2. Inserisci username di un cliente non attivato"
echo "  3. Step 2: Invia codice via email"
echo "  4. Step 2b: Inserisci il codice ricevuto via email"
echo "  5. Step 3: Crea password e completa attivazione"
echo "  6. ✅ Deve completare senza errori e fare login automatico"
echo ""
