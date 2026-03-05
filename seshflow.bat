@echo off
REM Seshflow 快捷启动脚本 (Windows)
REM 可以在任何目录运行，用于测试 seshflow

setlocal

REM seshflow CLI 的路径
set SESHFLOW_CLI=%~dp0packages\cli\bin\seshflow.js

REM 检查文件是否存在
if not exist "%SESHFLOW_CLI%" (
    echo 错误: 找不到 seshflow CLI
    echo 请确保此脚本在正确的目录下
    exit /b 1
)

REM 启动 seshflow
node "%SESHFLOW_CLI%" %*

endlocal
