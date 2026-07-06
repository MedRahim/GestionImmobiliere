@echo off
REM Contourne le probleme d'encodage du chemin (e accent) pour Gradle/Android
subst G: "%~dp0" >nul 2>&1
cd /d G:\
call npm run android
pause
