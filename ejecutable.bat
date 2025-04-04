@echo off
start "" "C:\Program Files\nodejs\node.exe" "C:\Users\izeac\OneDrive\Escritorio\Pruebas\server.js"
timeout /t 2 >nul
start "" "http://localhost:3000"
exit