#!/bin/bash

# Script per applicare la migrazione MySQL sul server
# Usage: ./apply_migration.sh

set -e  # Exit on error

echo "========================================"
echo "  Applicazione Migrazione: Projects"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f ../.env ]; then
    echo "❌ File .env non trovato!"
    echo "Assicurati di essere nella directory backend/migrations/"
    exit 1
fi

# Load database credentials from .env
source <(grep -v '^#' ../.env | sed 's/^/export /')

# Extract database connection info
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')

echo "📋 Dettagli connessione:"
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo ""

# Check if table already exists
echo "🔍 Verifico se la tabella 'projects' esiste già..."

TABLE_EXISTS=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -D"$DB_NAME" -sse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_name = 'projects';")

if [ "$TABLE_EXISTS" -eq "1" ]; then
    echo "⚠️  La tabella 'projects' esiste già!"
    echo ""
    read -p "Vuoi continuare comunque? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Migrazione annullata."
        exit 1
    fi
fi

# Apply migration
echo ""
echo "🚀 Applicazione migrazione..."

mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -D"$DB_NAME" < create_projects_table.sql

if [ $? -eq 0 ]; then
    echo "✅ Migrazione applicata con successo!"
    echo ""

    # Verify table was created
    echo "🔍 Verifica creazione tabella..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -D"$DB_NAME" -e "DESCRIBE projects;"

    echo ""
    echo "✅ Tabella 'projects' creata correttamente!"
    echo ""
    echo "📝 Prossimi passi:"
    echo "   1. cd .."
    echo "   2. npx prisma generate"
    echo "   3. npm run build"
    echo "   4. pm2 restart <nome-processo>"
else
    echo "❌ Errore durante l'applicazione della migrazione!"
    exit 1
fi
