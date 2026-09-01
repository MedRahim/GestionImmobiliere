@echo off
REM USB phone: reverse Metro seulement (API = Azure si USE_AZURE_API=true)
set ANDROID_SERIAL=71c2e6a6
set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
if not exist "%ADB%" set ADB=adb

"%ADB%" -s %ANDROID_SERIAL% reverse tcp:8081 tcp:8081
echo OK - Metro 8081 reverse pour %ANDROID_SERIAL%
echo API Azure: http://74.248.16.228:5000 (pas de reverse 5000)
"%ADB%" -s %ANDROID_SERIAL% shell am force-stop com.immobiliermobile
"%ADB%" -s %ANDROID_SERIAL% shell am start -n com.immobiliermobile/.MainActivity
echo Ouvre l'app puis secoue le tel ^> Reload si besoin
pause
