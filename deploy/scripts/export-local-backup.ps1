# Sauvegarde la BDD locale (MONSTER) pour migration vers Azure
# Usage: .\export-local-backup.ps1

$ErrorActionPreference = 'Stop'
$database = 'RealEstateManagement'
$bakDir = 'C:\Temp\immo-backup'
$bak = Join-Path $bakDir 'RealEstateManagement.bak'
$servers = @('MONSTER', 'localhost', '.', '(local)')

$connected = $false
foreach ($server in $servers) {
  Write-Host "Essai SQL Server: $server"
  $test = sqlcmd -S $server -E -Q "SELECT 1" -h -1 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Connecte a $server"
    $connected = $true
    break
  }
}

if (-not $connected) {
  throw "SQL Server inaccessible. Lance start-sqlserver.bat en administrateur puis relance ce script."
}

Write-Host "Backup $database -> $bak"
New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
sqlcmd -S $server -E -Q "BACKUP DATABASE [$database] TO DISK = N'$bak' WITH FORMAT, INIT, COMPRESSION, STATS = 10"

if (-not (Test-Path $bak)) {
  throw "Backup echoue. Verifie que SQL Server (MONSTER) tourne sur ton PC."
}

$sizeMb = [math]::Round((Get-Item $bak).Length / 1MB, 1)
Write-Host "OK - $sizeMb MB -> $bak"
