#!/bin/bash

# ============================================
# FIX: Notification Controller Prisma Error
# ============================================

echo "🔧 Fixing notification controller Prisma error..."
echo ""
echo "This will:"
echo "  1. Pull latest code"
echo "  2. Regenerate Prisma client"
echo "  3. Recompile TypeScript"
echo "  4. Restart backend"
echo ""

# Server credentials
SERVER="root@185.229.236.196"

echo "📡 Connecting to server..."

# Deploy command
ssh "$SERVER" << 'ENDSSH'
cd /var/www/crm-dashboard

echo "📥 Pulling latest code..."
git pull origin main

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

echo "🔄 Restarting backend..."
pm2 restart crm-backend

echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "📋 Checking backend logs for errors..."
pm2 logs crm-backend --lines 30 --nostream

echo ""
echo "📊 PM2 Status..."
pm2 status

echo ""
echo "✅ FIX COMPLETATO!"
ENDSSH

echo ""
echo "🎉 Notification controller fix deployed!"
echo ""
echo "✅ Next: Check if notification errors are gone"
echo ""
