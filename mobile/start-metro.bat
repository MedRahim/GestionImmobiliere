@echo off
REM Demarrer Metro (obligatoire avant l'app Android)
subst G: "%~dp0" >nul 2>&1
cd /d G:\
echo Metro sur http://localhost:8081
npx react-native start --reset-cache
pause
