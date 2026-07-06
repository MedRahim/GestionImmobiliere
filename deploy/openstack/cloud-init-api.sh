#!/bin/bash
# OpenStack User Data — VM API Node.js (Ubuntu 22.04)
# Coller dans Horizon → Instance → Configuration → User Data

set -eux

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

npm install -g pm2

mkdir -p /opt/immobiliere/backend/uploads
chown -R ubuntu:ubuntu /opt/immobiliere

# Le code est clone manuellement ou via CI apres le premier boot :
#   su - ubuntu -c 'git clone https://github.com/MedRahim/GestionImmobiliere.git /opt/immobiliere'

echo "VM API prete. SSH puis clone le repo, configure .env, pm2 start."
