@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo   EVAH Host Companion — Uninstaller
echo ======================================================================

set "INSTALL_DIR=%LOCALAPPDATA%\EVAH\HostCompanion"

echo [1/3] Terminating any running companion processes...
REM Stop companion process if lock file exists
if exist "%INSTALL_DIR%\companion.lock" (
  set /p LOCK_PID=<"%INSTALL_DIR%\companion.lock"
  if defined LOCK_PID (
    taskkill /PID !LOCK_PID! /T /F >nul 2>&1
  )
)

echo [2/3] Removing Windows login AutoStart registry entry...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "EVAHHostCompanion" /f >nul 2>&1

echo [3/3] Removing companion files from %INSTALL_DIR%...
if exist "%INSTALL_DIR%" (
  del /Q "%INSTALL_DIR%\*.*" >nul 2>&1
  rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
)

echo ======================================================================
echo   EVAH Host Companion has been completely uninstalled.
echo ======================================================================
pause
