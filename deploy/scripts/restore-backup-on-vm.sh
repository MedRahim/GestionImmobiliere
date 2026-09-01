#!/bin/bash
# Restaure la BDD locale sur Azure SQL Server Docker + copie les uploads
# Usage: ./restore-backup-on-vm.sh [sa_password]

set -euo pipefail

SA_PASSWORD="${1:-ImmoAzure2026!Strong}"
BAK="$HOME/RealEstateManagement.bak"
UPLOADS_SRC="$HOME/uploads-backup"
CONTAINER=immobiliere-mssql

if [ ! -f "$BAK" ]; then
  echo "Backup introuvable: $BAK"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Conteneur $CONTAINER absent."
  exit 1
fi

SQLCMD="docker exec -i $CONTAINER /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P ${SA_PASSWORD} -C"

echo "Copie backup dans le conteneur..."
docker exec "$CONTAINER" mkdir -p /var/opt/mssql/backup
docker cp "$BAK" "$CONTAINER:/var/opt/mssql/backup/RealEstateManagement.bak"

echo "Lecture des fichiers logiques..."
FILELIST=$($SQLCMD -Q "RESTORE FILELISTONLY FROM DISK='/var/opt/mssql/backup/RealEstateManagement.bak'" -h -1 -W)
DATA_LOGICAL=$(echo "$FILELIST" | sed -n '1p' | awk '{print $1}')
LOG_LOGICAL=$(echo "$FILELIST" | sed -n '2p' | awk '{print $1}')

echo "Data: $DATA_LOGICAL | Log: $LOG_LOGICAL"

echo "Restauration..."
$SQLCMD -Q "
IF DB_ID('RealEstateManagement') IS NOT NULL
BEGIN
  ALTER DATABASE RealEstateManagement SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE RealEstateManagement;
END;
RESTORE DATABASE RealEstateManagement
FROM DISK='/var/opt/mssql/backup/RealEstateManagement.bak'
WITH
  MOVE '${DATA_LOGICAL}' TO '/var/opt/mssql/data/RealEstateManagement.mdf',
  MOVE '${LOG_LOGICAL}' TO '/var/opt/mssql/data/RealEstateManagement_log.ldf',
  REPLACE, STATS=10;
"

if [ -d "$UPLOADS_SRC" ]; then
  echo "Copie images uploads..."
  docker cp "$UPLOADS_SRC/." immobiliere-api:/app/uploads/
fi

echo "Redemarrage API..."
cd "$HOME/GestionImmobiliere/deploy/docker"
docker compose up -d

COUNT=$($SQLCMD -d RealEstateManagement -Q "SELECT COUNT(*) FROM dbo.Properties" -h -1 -W | tr -d '[:space:]')
echo "OK - Properties count: $COUNT"
