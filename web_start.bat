@echo off
echo Starting Backend Server...
start /b network.exe --server --port 3001 --data data

echo Starting Frontend Server...
cd frontend
set PORT=3002
start npm run dev

echo.
echo ================================
echo   Server Started!
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:3002
echo ================================
echo.
echo Press any key to stop all servers...
pause > nul

echo Stopping servers...
taskkill /F /IM network.exe 2>nul
taskkill /F /IM node.exe 2>nul
echo Done.