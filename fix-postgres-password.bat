@echo off
echo ========================================
echo 修复 PostgreSQL 密码问题
echo ========================================

echo.
echo 方案 1: 使用当前 PostgreSQL 用户连接
echo 请输入你的 PostgreSQL 密码（安装时设置的密码）：
set /p POSTGRES_PASSWORD=密码: 

echo.
echo 测试连接...
set PGPASSWORD=%POSTGRES_PASSWORD%
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% eq 0 (
    echo 连接成功！更新 .env 文件...
    cd backend
    echo # Database Configuration > .env.new
    echo DB_HOST=localhost >> .env.new
    echo DB_PORT=5432 >> .env.new
    echo DB_NAME=trade_inquiry_db >> .env.new
    echo DB_USER=postgres >> .env.new
    echo DB_PASSWORD=%POSTGRES_PASSWORD% >> .env.new
    echo. >> .env.new
    echo # Redis Configuration >> .env.new
    echo REDIS_HOST=localhost >> .env.new
    echo REDIS_PORT=6379 >> .env.new
    echo REDIS_PASSWORD= >> .env.new
    echo. >> .env.new
    echo # JWT Configuration >> .env.new
    echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production >> .env.new
    echo JWT_EXPIRES_IN=24h >> .env.new
    echo. >> .env.new
    echo # Server Configuration >> .env.new
    echo PORT=3000 >> .env.new
    echo NODE_ENV=development >> .env.new
    echo. >> .env.new
    echo # File Upload Configuration >> .env.new
    echo UPLOAD_DIR=uploads >> .env.new
    echo MAX_FILE_SIZE=10485760 >> .env.new
    echo. >> .env.new
    echo # Translation API Configuration >> .env.new
    echo TRANSLATION_API_KEY=your-translation-api-key >> .env.new
    echo TRANSLATION_SERVICE=baidu >> .env.new
    
    move .env.new .env
    echo .env 文件已更新！
    cd ..
    goto success
) else (
    echo 连接失败，尝试其他方案...
)

echo.
echo 方案 2: 重置 postgres 用户密码
echo 需要管理员权限，请以管理员身份运行此脚本
echo.
echo 或者手动执行以下步骤：
echo 1. 以管理员身份打开命令提示符
echo 2. 运行: psql -U postgres
echo 3. 执行: ALTER USER postgres PASSWORD 'password';
echo 4. 退出: \q
echo.

:success
echo.
echo 现在可以尝试启动服务器了！
pause