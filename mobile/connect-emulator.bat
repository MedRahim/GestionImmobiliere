@echo off
REM Relie l'emulateur a Metro + API backend
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
echo OK - emulator connecte a Metro (8081) et API (5000)
adb shell am force-stop com.immobiliermobile
adb shell am start -n com.immobiliermobile/.MainActivity
pause
