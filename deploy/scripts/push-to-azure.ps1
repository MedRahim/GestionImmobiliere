# Envoie backup BDD + images + met a jour la config Azure
# Usage: .\push-to-azure.ps1

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$backendEnv = Join-Path $projectRoot 'backend\.env'
$bak = 'C:\Temp\immo-backup\RealEstateManagement.bak'
$key = Join-Path $env:USERPROFILE 'Downloads\immo-vm_key.pem'
$vm = 'azureuser@74.248.16.228'
$uploads = Join-Path $projectRoot 'backend\uploads'

if (-not (Test-Path $bak)) {
  Write-Host "Backup introuvable. Lance d'abord: .\export-local-backup.ps1"
  exit 1
}
if (-not (Test-Path $key)) {
  throw "Cle SSH introuvable: $key"
}
if (-not (Test-Path $backendEnv)) {
  throw "backend\.env introuvable"
}

$envVars = @{}
Get-Content $backendEnv | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $envVars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$googleId = $envVars['GOOGLE_CLIENT_ID']
$groqKey = $envVars['GROQ_API_KEY']
$groqModel = if ($envVars['GROQ_MODEL']) { $envVars['GROQ_MODEL'] } else { 'llama-3.1-8b-instant' }
$dbPassword = 'ImmoAzure2026!Strong'

Write-Host "Envoi backup vers Azure..."
scp -i $key $bak "${vm}:~/RealEstateManagement.bak"

if (Test-Path $uploads) {
  Write-Host "Envoi images uploads..."
  scp -i $key -r $uploads "${vm}:~/uploads-backup"
}

$remoteEnv = @"
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
API_PREFIX=/api

DB_USE_WINDOWS_AUTH=false
DB_HOST=mssql
DB_PORT=1433
DB_NAME=RealEstateManagement
DB_USER=sa
DB_PASSWORD=$dbPassword

JWT_SECRET=immo-jwt-secret-change-in-production-2026
JWT_REFRESH_SECRET=immo-jwt-refresh-secret-change-in-production-2026
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

CORS_ORIGIN=*

GOOGLE_CLIENT_ID=$googleId
AI_PROVIDER=groq
GROQ_API_KEY=$groqKey
GROQ_MODEL=$groqModel
"@

$localEnvFile = Join-Path $env:TEMP 'docker-azure.env'
Set-Content -Path $localEnvFile -Value $remoteEnv -Encoding utf8
scp -i $key $localEnvFile "${vm}:~/GestionImmobiliere/deploy/docker/.env"

Write-Host "Copie script restore..."
scp -i $key (Join-Path $PSScriptRoot 'restore-backup-on-vm.sh') "${vm}:~/restore-backup-on-vm.sh"

Write-Host "Restauration sur Azure..."
ssh -i $key $vm "chmod +x ~/restore-backup-on-vm.sh && ~/restore-backup-on-vm.sh '$dbPassword'"

Write-Host ""
Write-Host "OK - donnees locales migrees sur Azure."
Write-Host "Test: curl http://74.248.16.228:5000/api/properties"
Write-Host ""
