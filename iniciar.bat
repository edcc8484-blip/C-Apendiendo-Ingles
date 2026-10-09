@echo off
cd /d "%~dp0"
rem Usa el lanzador "py" si existe; si no, "python".
set "PY=python"
where py >nul 2>nul && set "PY=py"
start "" http://localhost:8000
%PY% server.py
pause
