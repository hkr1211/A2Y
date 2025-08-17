@echo off
echo ========================================
echo PostgreSQL 安装和启动脚本
echo ========================================

echo 检查 PostgreSQL 服务状态...
sc query postgresql-x64-17 >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL 服务已安装，尝试启动...
    echo 需要管理员权限启动服务，请以管理员身份运行此脚本
    echo.
    echo 或者手动启动：
    echo 1. 按 Win+R，输入 services.msc
    echo 2. 找到 "postgresql-x64-17" 服务
    echo 3. 右键点击，选择"启动"
    echo.
    pause
    exit /b 1
) else (
    echo PostgreSQL 服务未找到，开始安装...
)

echo.
echo 检查是否有 Chocolatey...
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 安装 Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
)

echo.
echo 安装 PostgreSQL...
choco install postgresql --params '/Password:password' -y

echo.
echo 等待服务启动...
timeout /t 10 /nobreak > nul

echo.
echo 测试连接...
pg_isready -h localhost -p 5432
if %errorlevel% eq 0 (
    echo PostgreSQL 安装成功！
    echo 现在可以运行数据库初始化脚本：
    echo psql -U postgres -f setup-database.sql
) else (
    echo PostgreSQL 可能需要手动启动服务
    echo 请以管理员身份运行：net start postgresql-x64-17
)

pause