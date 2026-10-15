@echo off
setlocal
if "%PORT%"=="" set "PORT=8080"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js non trovato.
  echo   Scaricalo da https://nodejs.org ^(versione LTS^), poi riprova.
  echo.
  pause
  exit /b 1
)

echo.
echo   ===============================================
echo    Car Wars - backend condiviso in avvio
echo   ===============================================
echo.
echo    Apri nel browser:  http://localhost:%PORT%
echo    Per fermare il server:  CTRL + C
echo.
echo    (password amministratore: imposta CAR_WARS_TOKEN
echo     prima di lanciare, es.  set CAR_WARS_TOKEN=miapass)
echo.

start "" cmd /c "timeout /t 2 >nul & start "" http://localhost:%PORT%"
node "%~dp0server.js"

echo.
echo   Server fermato.
pause
