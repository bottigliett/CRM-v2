#!/bin/bash
# Deployment script for token fix

set -e  # Exit on error

echo "=========================================="
echo "Deploying token size fix to production"
echo "=========================================="
echo ""

# Step 1: Backup database (optional but recommended)
echo "Step 1/8: Database backup (optional)"
echo "Skipping automatic backup - please ensure you have a recent backup"
echo ""

# Step 2: Pull latest code
echo "Step 2/8: Pulling latest code from GitHub..."
cd /var/www/crm-dashboard
git pull origin main
echo "✓ Code updated"
echo ""

# Step 3: Navigate to backend
echo "Step 3/8: Navigating to backend directory..."
cd backend
echo "✓ In backend directory"
echo ""

# Step 4: Run database migration
echo "Step 4/8: Running database migration..."
mysql -u root -p crm_dashboard < prisma/migrations/fix-token-column.sql
echo "✓ Migration completed"
echo ""

# Step 5: Install dependencies
echo "Step 5/8: Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 6: Regenerate Prisma client
echo "Step 6/8: Regenerating Prisma client..."
npx prisma generate
echo "✓ Prisma client regenerated"
echo ""

# Step 7: Compile TypeScript
echo "Step 7/8: Compiling TypeScript..."
npx tsc
echo "✓ TypeScript compiled"
echo ""

# Step 8: Restart backend
echo "Step 8/8: Restarting backend service..."
pm2 restart crm-backend
echo "✓ Backend restarted"
echo ""

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "You can now test the login at http://localhost:5173/auth/sign-in"
echo ""
