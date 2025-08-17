@echo off
echo ========================================
echo 贸易询单订单系统 - 测试套件
echo ========================================

:menu
echo.
echo 请选择要运行的测试：
echo 1. 后端单元测试
echo 2. 前端单元测试
echo 3. E2E 端到端测试
echo 4. 安全测试套件
echo 5. 运行所有测试
echo 6. 退出
echo.
set /p choice=请输入选择 (1-6): 

if "%choice%"=="1" goto backend_test
if "%choice%"=="2" goto frontend_test
if "%choice%"=="3" goto e2e_test
if "%choice%"=="4" goto security_test
if "%choice%"=="5" goto all_tests
if "%choice%"=="6" goto end
goto menu

:backend_test
echo.
echo 运行后端单元测试...
cd backend
call npm test
cd ..
goto menu

:frontend_test
echo.
echo 运行前端单元测试...
cd frontend
call npm test
cd ..
goto menu

:e2e_test
echo.
echo 运行 E2E 端到端测试...
echo 请确保前后端服务器都在运行！
cd frontend
call npm run e2e
cd ..
goto menu

:security_test
echo.
echo 运行安全测试套件...
cd backend
call npm run security:all
cd ..
goto menu

:all_tests
echo.
echo 运行所有测试...
echo.
echo 1/4 后端单元测试...
cd backend
call npm test
echo.
echo 2/4 前端单元测试...
cd ..\frontend
call npm test
echo.
echo 3/4 安全测试...
cd ..\backend
call npm run security:test
echo.
echo 4/4 E2E 测试（需要服务器运行）...
cd ..\frontend
call npm run e2e
cd ..
echo.
echo 所有测试完成！
goto menu

:end
echo 测试结束
pause