@echo off
echo Demarrage de SQL Server (admin requis)...
net start MSSQLSERVER
if %errorlevel% equ 0 (
    echo SQL Server demarre avec succes.
) else (
    echo.
    echo Echec. Ouvrez services.msc en tant qu'administrateur
    echo et demarrez "SQL Server (MSSQLSERVER)" manuellement.
)
pause
