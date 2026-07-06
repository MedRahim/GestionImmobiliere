#!/bin/bash
# Initialise la BDD dans SQL Server (Docker local ou VM OpenStack)
# Usage: ./init-database.sh [host] [sa_password]

set -euo pipefail

HOST="${1:-localhost}"
SA_PASSWORD="${2:-ChangeMe_Strong_Password_123!}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

SQLCMD="docker exec -i immobiliere-mssql /opt/mssql-tools18/bin/sqlcmd -S ${HOST} -U sa -P ${SA_PASSWORD} -C"

if docker ps --format '{{.Names}}' | grep -q '^immobiliere-mssql$'; then
  echo "Creation base RealEstateManagement..."
  $SQLCMD -Q "IF DB_ID('RealEstateManagement') IS NULL CREATE DATABASE RealEstateManagement"
  echo "Application schema.sql..."
  $SQLCMD -d RealEstateManagement -i /dev/stdin < "${ROOT}/database/schema.sql"
  echo "Application seed-data.sql..."
  $SQLCMD -d RealEstateManagement -i /dev/stdin < "${ROOT}/database/seed-data.sql"
  echo "OK"
else
  echo "Conteneur immobiliere-mssql introuvable. Lancez: cd deploy/docker && docker compose up -d"
  exit 1
fi
