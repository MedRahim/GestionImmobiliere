@echo off
title Immo Dary - Wi-Fi (sans cable)
echo.
echo  Telephone et PC sur le MEME Wi-Fi
echo  IP PC : 192.168.0.42
echo.
echo  [1] Ouvrir pare-feu Windows (ports 5000 + 8081)...
netsh advfirewall firewall add rule name="ImmoDary API" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
netsh advfirewall firewall add rule name="ImmoDary Metro" dir=in action=allow protocol=TCP localport=8081 >nul 2>&1
echo.
echo  Lance backend et Metro manuellement ou laisse-les tourner.
echo  Metro doit etre : npx react-native start --host 0.0.0.0
echo.
pause
