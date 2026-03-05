#!/usr/bin/env node
/**
 * Seshflow 快捷启动脚本
 * 可以在任何目录运行，用于测试 seshflow
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// seshflow CLI 的路径
const SESHFLOW_CLI = path.join(__dirname, 'packages/cli/bin/seshflow.js');

// 获取命令行参数
const args = process.argv.slice(2);

// 启动 seshflow
const child = spawn('node', [SESHFLOW_CLI, ...args], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('error', (error) => {
  console.error('启动失败:', error.message);
  console.error('请确保在正确的目录下运行此脚本');
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
