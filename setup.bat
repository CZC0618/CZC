@echo off
echo === Checking Node.js and npm versions ===
node -v
npm -v

echo.
echo === Installing backend dependencies ===
cd backend
call npm install

echo.
echo === Installing frontend dependencies ===
cd ..\frontend
call npm install

echo.
echo === Setup complete ===
pause
