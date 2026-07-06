# Sauvegarde la BDD locale (MONSTER) pour migration vers Azure
# Usage: .\export-local-backup.ps1

$ErrorActionPreference = 'Stop'
$server = 'MONSTER'
$database = 'RealEstateManagement'
$outDir = Join-Path $env:USERPROFILE 'Downloads'
$bak = Join-Path $outDir 'RealEstateManagement.bak'

Write-Host "Backup $database sur $server -> $bak"

sqlcmd -S $server -E -Q "BACKUP DATABASE [$database] TO DISK = N'$bak' WITH FORMAT, INIT, COMPRESSION, STATS = 10"

if (-not (Test-Path $bak)) {
  throw "Backup echoue. Verifie que SQL Server (MONSTER) tourne sur ton PC."
}

$sizeMb = [math]::Round((Get-Item $bak).Length / 1MB, 1)
Write-Host "OK - $sizeMb MB -> $bak"
