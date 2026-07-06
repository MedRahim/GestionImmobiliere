#!/bin/bash
# OpenStack User Data — VM SQL Server (Ubuntu 22.04)
# Coller dans Horizon → Instance → Configuration → User Data

set -eux

# === A MODIFIER ===
MSSQL_SA_PASSWORD='ChangeMe_Strong_Password_123!'
# ==================

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y docker.io docker-compose-v2 curl

systemctl enable docker
systemctl start docker

mkdir -p /data/mssql
chmod 777 /data/mssql

docker run -d \
  --name mssql \
  --restart unless-stopped \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD="${MSSQL_SA_PASSWORD}" \
  -e MSSQL_PID=Developer \
  -p 127.0.0.1:1433:1433 \
  -v /data/mssql:/var/opt/mssql \
  mcr.microsoft.com/mssql/server:2022-latest

# Attendre que SQL Server soit prêt
sleep 30
docker exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -Q "SELECT 1" || true

echo "SQL Server demarre. Executer schema.sql manuellement apres le deploy API."
