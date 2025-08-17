@echo off
echo ========================================
echo 测试 PostgreSQL 连接
echo ========================================

echo 尝试常见密码...

echo.
echo 1. 尝试空密码...
set PGPASSWORD=
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% eq 0 (
    echo ✅ 空密码连接成功！
    goto update_env
)

echo.
echo 2. 尝试密码: postgres
set PGPASSWORD=postgres
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% eq 0 (
    echo ✅ 密码 'postgres' 连接成功！
    set CORRECT_PASSWORD=postgres
    goto update_env
)

echo.
echo 3. 尝试密码: admin
set PGPASSWORD=admin
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% eq 0 (
    echo ✅ 密码 'admin' 连接成功！
    set CORRECT_PASSWORD=admin
    goto update_env
)

echo.
echo 4. 尝试密码: password
set PGPASSWORD=password
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% eq 0 (
    echo ✅ 密码 'password' 连接成功！
    set CORRECT_PASSWORD=password
    goto update_env
)

echo.
echo ❌ 所有常见密码都失败了
echo 请手动输入你的 PostgreSQL 密码：
set /p USER_PASSWORD=密码: 
set PGPASSWORD=%USER_PASSWORD%
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% eq 0 (
    echo ✅ 密码 '%USER_PASSWORD%' 连接成功！
    set CORRECT_PASSWORD=%USER_PASSWORD%
    goto update_env
) else (
    echo ❌ 密码错误
    goto manual_fix
)

:update_env
echo.
echo 更新 .env 文件...
cd backend
if "%CORRECT_PASSWORD%"=="" (
    set CORRECT_PASSWORD=
)
echo # Database Configuration > .env.new
echo DB_HOST=localhost >> .env.new
echo DB_PORT=5432 >> .env.new
echo DB_NAME=trade_inquiry_db >> .env.new
echo DB_USER=postgres >> .env.new
echo DB_PASSWORD=%CORRECT_PASSWORD% >> .env.new
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
echo ✅ .env 文件已更新！
cd ..
echo.
echo 现在可以启动服务器了：
echo cd backend && npm run dev
goto end

:manual_fix
echo.
echo 需要手动重置密码：
echo 1. 以管理员身份打开命令提示符
echo 2. 运行: psql -U postgres
echo 3. 执行: ALTER USER postgres PASSWORD 'password';
echo 4. 退出: \q
echo 5. 然后重新运行此脚本

:end
pause