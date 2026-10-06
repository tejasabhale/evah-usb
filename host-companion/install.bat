@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo   EVAH Host Companion — Windows Installer
echo ======================================================================
echo Installing EVAH Host Companion for user: %USERNAME%

set "INSTALL_DIR=%LOCALAPPDATA%\EVAH\HostCompanion"
set "SCRIPT_DIR=%~dp0"

echo [1/4] Creating installation directory at:
echo       %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/4] Copying companion files...
copy /Y "%SCRIPT_DIR%dist\companion.cjs" "%INSTALL_DIR%\companion.cjs" >nul
if errorlevel 1 (
  copy /Y "%SCRIPT_DIR%companion.cjs" "%INSTALL_DIR%\companion.cjs" >nul
)

copy /Y "%SCRIPT_DIR%evah-companion.vbs" "%INSTALL_DIR%\evah-companion.vbs" >nul
copy /Y "%SCRIPT_DIR%uninstall.bat" "%INSTALL_DIR%\uninstall.bat" >nul

REM Copy node.exe if not present in install directory
if not exist "%INSTALL_DIR%\node.exe" (
  for /f "delims=" %%I in ('where node.exe 2^>nul') do (
    if not exist "%INSTALL_DIR%\node.exe" (
      copy /Y "%%I" "%INSTALL_DIR%\node.exe" >nul
    )
  )
)

echo [3/4] Registering auto-start on Windows login...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "EVAHHostCompanion" /t REG_SZ /d "wscript.exe \"%INSTALL_DIR%\evah-companion.vbs\"" /f >nul

echo [4/4] Starting EVAH Host Companion in background...
start "" wscript.exe "%INSTALL_DIR%\evah-companion.vbs"

echo ======================================================================
echo   EVAH Host Companion successfully installed and running!
echo ======================================================================
echo Whenever you insert your EVAH USB drive, EVAH will launch automatically.
echo To uninstall at any time, run: "%INSTALL_DIR%\uninstall.bat"
echo ======================================================================
pause
