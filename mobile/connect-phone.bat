@echo off
REM USB phone: reverse Metro + API to localhost on the device
set ANDROID_SERIAL=71c2e6a6
adb -s %ANDROID_SERIAL% reverse tcp:8081 tcp:8081
adb -s %ANDROID_SERIAL% reverse tcp:5000 tcp:5000
echo OK - phone %ANDROID_SERIAL% connected to Metro (8081) and API (5000)
adb -s %ANDROID_SERIAL% shell am force-stop com.immobiliermobile
adb -s %ANDROID_SERIAL% shell am start -n com.immobiliermobile/.MainActivity
pause
