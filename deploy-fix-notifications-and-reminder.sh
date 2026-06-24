#!/bin/bash

# ============================================
# FIX: Notification Controller + Reminder Process
# ============================================

echo "🔧 Fixing notification controller and reminder process..."
echo ""
echo "This will:"
echo "  1. Pull latest code"
echo "  2. Clean rebuild backend"
echo "  3. Restart backend"
echo "  4. Restart/Start reminder process"
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
git log --oneline -3

echo ""
echo "=== BACKEND FIX ===="

cd backend

echo "🧹 Cleaning dist folder..."
rm -rf dist

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "⚙️  Compiling TypeScript..."
npx tsc

echo ""
echo "🔍 Verifying compilation..."
if [ -f "dist/controllers/notification.controller.js" ]; then
  echo "✅ notification.controller.js compiled"
  head -10 dist/controllers/notification.controller.js
else
  echo "❌ notification.controller.js NOT found"
fi

echo ""
if [ -f "dist/scripts/process-reminders.js" ]; then
  echo "✅ process-reminders.js compiled"
else
  echo "❌ process-reminders.js NOT found"
fi

echo ""
echo "=== RESTART SERVICES ==="

echo "🔄 Restarting backend..."
pm2 restart crm-backend

echo "⏳ Waiting for backend to start..."
sleep 3

echo ""
echo "🔄 Checking if reminder process exists..."
if pm2 list | grep -q "crm-reminder"; then
  echo "Found crm-reminder, restarting..."
  pm2 restart crm-reminder
else
  echo "crm-reminder not found, starting new process..."
  pm2 start dist/scripts/process-reminders.js --name crm-reminder
fi

echo "⏳ Waiting for processes to start..."
sleep 3

echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Backend logs (last 20 lines):"
pm2 logs crm-backend --lines 20 --nostream

echo ""
echo "📋 Reminder logs (last 10 lines):"
pm2 logs crm-reminder --lines 10 --nostream

echo ""
echo "✅ FIX COMPLETATO!"
ENDSSH

echo ""
echo -e "${GREEN}🎉 Deployment completato!${NC}"
echo ""
echo "✅ Backend compilato e riavviato"
echo "✅ Processo reminder avviato/riavviato"
echo ""
echo -e "${YELLOW}Test da fare:${NC}"
echo "  1. Verifica che gli errori notification controller siano spariti"
echo "  2. Verifica che il processo crm-reminder sia attivo in PM2"
echo ""
