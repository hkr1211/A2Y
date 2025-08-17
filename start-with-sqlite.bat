@echo off
echo ========================================
echo 使用 SQLite 启动系统（无需 PostgreSQL）
echo ========================================

echo.
echo 1. 安装 SQLite 依赖...
cd backend
call npm install sqlite3 --save
if %errorlevel% neq 0 (
    echo 错误：SQLite 依赖安装失败
    pause
    exit /b 1
)

echo.
echo 2. 配置环境变量使用 SQLite...
if not exist .env (
    copy .env.example .env
)

echo # SQLite Configuration for Development >> .env
echo DB_TYPE=sqlite >> .env
echo DB_PATH=./database.sqlite >> .env

echo.
echo 3. 安装前端依赖...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo 错误：前端依赖安装失败
    pause
    exit /b 1
)

echo.
echo 4. 启动服务...
echo 正在启动后端服务器（SQLite 模式）...
cd ..\backend
start "后端服务器 (SQLite)" cmd /k "npm run dev"

timeout /t 3 /nobreak > nul

echo 正在启动前端服务器...
cd ..\frontend
start "前端服务器" cmd /k "npm run dev"

echo.
echo ========================================
echo 启动完成！（使用 SQLite 数据库）
echo.
echo 前端地址：http://localhost:5173
echo 后端地址：http://localhost:3000
echo.
echo 默认管理员账户：
echo 用户名：admin
echo 密码：admin123
echo.
echo 注意：使用 SQLite 进行开发测试
echo 生产环境建议使用 PostgreSQL
echo ========================================

pause