@echo off
REM Lanzador del escaner de red - doble click para ejecutar
REM Requiere que escanear-red.ps1 este en la misma carpeta
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0escanear-red.ps1"
