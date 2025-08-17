@echo off
echo ========================================
echo 贸易询单订单系统 - 本地启动脚本
echo ========================================

echo.
echo 1. 检查 Node.js 版本...
node --version
if %errorlevel% neq 0 (
    echo 错误：请先安装 Node.js
    pause
    exit /b 1
)

echo.
echo 2. 检查 PostgreSQL 连接...
pg_isready -h localhost -p 5432
if %errorlevel% neq 0 (
    echo 警告：PostgreSQL 可能未运行，请确保数据库服务已启动
)

echo.
echo 3. 设置后端环境...
cd backend
if not exist .env (
    echo 复制环境变量文件...
    copy .env.example .env
)

echo 安装后端依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误：后端依赖安装失败
    pause
    exit /b 1
)

echo.
echo 4. 设置前端环境...
cd ..\frontend
echo 安装前端依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误：前端依赖安装失败
    pause
    exit /b 1
)

echo.
echo 5. 启动服务...
echo 正在启动后端服务器...
cd ..\backend
start "后端服务器" cmd /k "npm run dev"

timeout /t 3 /nobreak > nul

echo 正在启动前端服务器...
cd ..\frontend
start "前端服务器" cmd /k "npm run dev"

echo.
echo ========================================
echo 启动完成！
echo.
echo 前端地址：http://localhost:5173
echo 后端地址：http://localhost:3000
echo 系统监控：http://localhost:3000/api/monitoring/health
echo.
echo 默认管理员账户：
echo 用户名：admin
echo 密码：admin123
echo ========================================

pause