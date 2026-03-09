import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildWorkspaceSnapshot } from '../shared/workspace-snapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const taskFile = path.join(repoRoot, '.seshflow', 'tasks.json');

function readWorkspaceSnapshot() {
  const raw = fs.readFileSync(taskFile, 'utf8');
  const data = JSON.parse(raw);
  return buildWorkspaceSnapshot(data);
}

function seshflowWorkspacePlugin() {
  return {
    name: 'seshflow-workspace-api',
    configureServer(server) {
      server.middlewares.use('/api/seshflow/workspace', (req, res) => {
        try {
          const body = JSON.stringify(readWorkspaceSnapshot());
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(body);
        } catch (error) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({
            error: 'workspace_snapshot_failed',
            message: error.message,
          }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), seshflowWorkspacePlugin()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
