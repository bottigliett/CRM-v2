# Deployment Instructions - Bug Fixes

## What was fixed:
1. ✅ IVA default changed from 22% to 0%
2. ✅ Client auth URLs fixed (`/client/auth/` → `/client-auth/`)
3. ✅ Quote creation `itemName` field added

## All fixes are committed to GitHub:
- Commit: `809259d` - "Fix critical bugs: client auth URLs and quote creation"
- Commit: `bccc124` - "Add comprehensive deployment script for bug fixes"

## How to deploy:

### Option 1: Run the deployment script (RECOMMENDED)
```bash
ssh root@185.229.236.196
# Enter password: ceE2DS43PK

cd /var/www/crm-dashboard
git pull origin main
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### Option 2: Manual deployment commands
```bash
ssh root@185.229.236.196
# Enter password: ceE2DS43PK

cd /var/www/crm-dashboard

# Pull latest code
git pull origin main

# Backend - clean rebuild
cd backend
rm -rf node_modules dist
npm install
npx prisma generate
npx tsc

# Frontend - clean rebuild
cd ../vite-version
rm -rf node_modules dist node_modules/.vite
npm install
npm run build

# Restart backend
pm2 restart crm-backend

# Verify
echo "Backend taxRate check:"
grep -n "taxRate = 0" ../backend/src/controllers/quote.controller.ts

echo "Frontend client-auth check:"
grep -n "client-auth/verify-username" src/lib/client-auth-api.ts

echo "Frontend itemName check:"
grep -n "itemName: string" src/lib/quotes-api.ts
```

## After deployment:

### Clear your browser cache!
**This is critical - otherwise you'll still see the old code**

#### Chrome/Edge:
1. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. Or: Open DevTools (F12) → Network tab → Check "Disable cache" → Reload

#### Firefox:
1. Press `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows/Linux)

#### Safari:
1. Press `Cmd+Option+R`

### Test the fixes:
1. **Quote creation**: Should not show "itemName: undefined" error
2. **IVA default**: Should be 0% when creating a new quote
3. **Client activation**: Should not show "401 Unauthorized - Token non fornito" error

## Why this should work now:

1. ✅ All source code changes are verified and committed
2. ✅ Clean rebuild removes all cached builds
3. ✅ Fresh npm install ensures correct dependencies
4. ✅ Hard browser refresh bypasses browser cache
5. ✅ New build will have different file hash (index-C9kedlPh.js)

## Verification commands after deployment:

Check what's actually deployed:
```bash
ssh root@185.229.236.196

# Check git commit
cd /var/www/crm-dashboard
git log --oneline -3

# Should show:
# bccc124 Add comprehensive deployment script for bug fixes
# 3cf960f Add frontend deployment script with nginx cache fix
# 809259d Fix critical bugs: client auth URLs and quote creation

# Check built files
cd vite-version/dist/assets
ls -lh index-*.js

# The main index file should be around 415-425KB
```
