@echo off
chcp 65001 >nul
title NetPlan Pro - CLI

cd /d "%~dp0"
build\network.exe --data data
pause
