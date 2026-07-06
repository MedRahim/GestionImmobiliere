@echo off
REM Migration complete PC -> Azure (demarrer SQL Server avant)
echo === 1/3 Demarrage SQL Server (admin requis) ===
net start MSSQLSERVER
if errorlevel 1 (
  echo Si echec: clic droit ^> Executer en tant qu'admin sur start-sqlserver.bat
)

echo.
echo === 2/3 Export backup local ===
powershell -ExecutionPolicy Bypass -File "%~dp0export-local-backup.ps1"
if errorlevel 1 pause & exit /b 1

echo.
echo === 3/3 Envoi vers Azure + restauration ===
powershell -ExecutionPolicy Bypass -File "%~dp0push-to-azure.ps1"
if errorlevel 1 pause & exit /b 1

echo.
echo Sur la VM, si pas deja fait:
echo   chmod +x ~/restore-backup-on-vm.sh
echo   ~/restore-backup-on-vm.sh "ImmoAzure2026!Strong"
pause
