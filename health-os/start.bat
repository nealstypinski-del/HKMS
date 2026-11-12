@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
if not exist whoop-mcp.config.json powershell -ExecutionPolicy Bypass -File scripts\find-whoop-mcp.ps1
call npm start
