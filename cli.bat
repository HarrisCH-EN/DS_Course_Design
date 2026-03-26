@echo off
chcp 65001 >nul
title NetMap Studio - CLI

cd /d "%~dp0"
network.exe --data data
pause
