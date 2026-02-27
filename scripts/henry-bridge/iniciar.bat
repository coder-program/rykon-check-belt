@echo off
title Henry Bridge - Rykon Check Belt
color 0A

echo =======================================================
echo    Henry Bridge - Rykon Check Belt
echo    Conecta catraca Henry COM backend na nuvem
echo =======================================================
echo.

:: Tenta encontrar o node em locais comuns
set NODE_CMD=node
if exist "C:\Program Files\nodejs\node.exe" set NODE_CMD="C:\Program Files\nodejs\node.exe"
if exist "C:\Program Files (x86)\nodejs\node.exe" set NODE_CMD="C:\Program Files (x86)\nodejs\node.exe"

:: Verifica se Node.js esta instalado
%NODE_CMD% --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Instale o Node.js em: https://nodejs.org
    echo Versao recomendada: LTS (ex: 20.x)
    echo Apos instalar, REINICIE o PC e tente novamente.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado:
%NODE_CMD% --version
echo.

echo [OK] Configuracao encontrada
echo.

:: Verifica se a porta 3000 esta em uso e mata o processo
echo Verificando porta 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo [AVISO] Porta 3000 em uso pelo processo PID=%%a - encerrando...
    taskkill /PID %%a /F >nul 2>&1
    echo [OK] Processo encerrado!
)
timeout /t 1 /nobreak >nul

echo Iniciando bridge...
echo Pressione Ctrl+C para parar
echo.

:loop
%NODE_CMD% henry-bridge.js
echo.
echo Bridge encerrado. Reiniciando em 5 segundos...
timeout /t 5 /nobreak >nul
goto loop
