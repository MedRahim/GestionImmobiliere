#!/bin/bash
# OpenStack User Data — UNE SEULE VM (API + SQL Server)
# Coller dans Horizon → Instance → User Data
#
# Cette VM fait tout : Docker + MSSQL + API Node.js (docker compose)

set -eux

MSSQL_SA_PASSWORD='ChangeMe_Strong_Password_123!'
REPO_URL='https://github.com/MedRahim/GestionImmobiliere.git'

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git docker.io docker-compose-v2

systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

mkdir -p /opt/immobiliere
chown -R ubuntu:ubuntu /opt/immobiliere

# Clone le projet (branche main = API auth + annonces)
su - ubuntu -c "git clone ${REPO_URL} /opt/immobiliere"

cd /opt/immobiliere/deploy/docker
cp ../openstack/.env.production.example .env

# Une seule VM : DB_HOST = nom du service Docker "mssql"
sed -i 's/DB_HOST=10.0.10.20/DB_HOST=mssql/' .env
sed -i "s/ChangeMe_Strong_Password_123!/${MSSQL_SA_PASSWORD}/" .env

docker compose up -d --build

echo "VM all-in-one prete. Attendre 1-2 min puis: curl http://localhost:5000/health"
echo "N'oublie pas d'initialiser la BDD (schema.sql) apres le premier boot."
