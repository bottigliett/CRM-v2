#!/bin/bash
# Check backend logs and errors

echo "Checking backend PM2 logs for errors..."
echo ""

ssh root@185.229.236.196 << 'ENDSSH'
echo "========== Last 50 lines of PM2 error log =========="
pm2 logs crm-backend --err --lines 50 --nostream

echo ""
echo "========== Backend status =========="
pm2 status crm-backend

echo ""
echo "========== Testing backend quote endpoint directly =========="
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AbWlzbW9zdHVkaW8uY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY1NTQ4MDM5LCJleHAiOjE3NjYxNTI4Mzl9.U2QlO2cdHbce70jdPVqg9lrofxUq8TW6bURuVRVyo3I" \
  -d '{
    "contactId": 1,
    "title": "Test Quote",
    "description": "Test",
    "items": [
      {
        "itemName": "Test Item",
        "description": "Test",
        "quantity": 1,
        "unitPrice": 100,
        "total": 100
      }
    ],
    "packages": [],
    "totalAmount": 100,
    "taxRate": 0,
    "taxAmount": 0,
    "grandTotal": 100
  }' 2>&1

echo ""
echo ""
echo "========== Checking TypeScript compilation =========="
cd /var/www/crm-dashboard/backend
ls -lh dist/controllers/quote.controller.js

echo ""
echo "========== Checking compiled quote controller for taxRate =========="
grep -n "taxRate" dist/controllers/quote.controller.js | head -10

ENDSSH
