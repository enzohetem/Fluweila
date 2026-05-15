@echo off
setlocal

set "ROOT=%~dp0"

echo Iniciando backend e frontend...
echo.

if not exist "%ROOT%backend\node_modules" (
  echo Instalando dependencias do backend...
  pushd "%ROOT%backend"
  call npm install
  popd
  echo.
)

if not exist "%ROOT%frontend\node_modules" (
  echo Instalando dependencias do frontend...
  pushd "%ROOT%frontend"
  call npm install
  popd
  echo.
)

start "Fluweila Backend - http://192.168.0.110:3333" cmd /k "cd /d ""%ROOT%backend"" && npm run dev"
start "Fluweila Frontend - http://192.168.0.110:5173" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev -- --host 0.0.0.0"

echo Backend:  http://192.168.0.110:3333
echo Frontend: http://192.168.0.110:5173
echo.
echo Duas janelas foram abertas. Feche-as para parar os servidores.

endlocal
