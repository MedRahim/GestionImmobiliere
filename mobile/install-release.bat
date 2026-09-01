@echo off
setlocal
set APK=%~dp0android\app\build\outputs\apk\release\app-release.apk
set SERIAL=71c2e6a6

if not exist "%APK%" (
  echo APK introuvable: %APK%
  echo Lance d'abord: cd android ^&^& gradlew assembleRelease
  pause
  exit /b 1
)

where adb >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
  ) else (
    echo adb introuvable. Installe Android SDK platform-tools.
    pause
    exit /b 1
  )
) else (
  set "ADB=adb"
)

echo.
echo Appareils connectes:
"%ADB%" devices
echo.

"%ADB%" devices | findstr /r "device$" | findstr /v "List of devices" >nul
if errorlevel 1 (
  echo Aucun telephone autorise. Active le debogage USB et accepte la popup.
  pause
  exit /b 1
)

echo Installation APK release sur %SERIAL%...
"%ADB%" -s %SERIAL% install -r "%APK%"
if errorlevel 1 (
  echo Retry sans serial specifique...
  "%ADB%" install -r "%APK%"
)

if errorlevel 1 (
  echo Echec installation.
  pause
  exit /b 1
)

echo.
echo OK - lancement de l'app...
"%ADB%" -s %SERIAL% shell am start -n com.immobiliermobile/.MainActivity 2>nul
echo Termine.
pause
