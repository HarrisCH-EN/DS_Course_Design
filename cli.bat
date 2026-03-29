@echo off
chcp 65001 >nul
title NetMap Studio - CLI

cd /d "%~dp0"
network.exe --data data
pause


@REM  g++ -std=c++11 -O2 src/main.cpp src/ApiServer.cpp src/SimpleHttpServer.cpp
@REM   src/graph/Graph.cpp src/algorithms/*.cpp src/io/FileIO.cpp src/ui/CLI.cpp -lws2_32 -o     
@REM   network.exe
