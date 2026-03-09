import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const taskFile = path.join(repoRoot, '.seshflow', 'tasks.json');

function readWorkspaceSnapshot() {
  const raw = fs.readFileSync(taskFile, 'utf8');
  const data = JSON.parse(raw);
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const tasksById = new Map(tasks.map(task => [task.id, task]));
  const currentTaskId = data.currentSession?.taskId || null;

  const enrichedTasks = tasks.map(task => {
    const unmetDependencies = (task.dependencies || []).filter(dependencyId => {
      const dependency = tasksById.get(dependencyId);
      return dependency && dependency.status !== 'done';
    });

    const runs = task.runtime?.runs || [];
    const processes = task.runtime?.processes || [];
    const runtimeEvents = (data.runtimeEvents || []).filter(event => event.taskId === task.id);

    return {
      ...task,
      unmetDependencies,
      runtimeSummary: {
        recordCount: runs.length,
        lastCommand: runs.at(-1)?.command || null,
        lastOutputRoot: runs.at(-1)?.outputRoot || null,
      },
      processSummary: {
        recordCount: processes.length,
        runningCount: processes.filter(process => process.state === 'running').length,
        missingCount: processes.filter(process => process.state === 'missing').length,
      },
      runtimeEventSummary: {
        count: runtimeEvents.length,
        lastType: runtimeEvents.at(-1)?.type || null,
      },
      recentRuns: runs.slice(-5).reverse(),
      recentProcesses: processes.slice(-5).reverse(),
      recentRuntimeEvents: runtimeEvents.slice(-5).reverse(),
    };
  });

  return {
    workspace: data.workspace || null,
    columns: data.columns || [],
    tasks: enrichedTasks,
    currentTask: enrichedTasks.find(task => task.id === currentTaskId) || null,
    runtimeEvents: (data.runtimeEvents || []).slice(-8),
    transitions: (data.transitions || []).slice(-8),
    focus: currentTaskId ? 'current-task' : 'next-ready-task',
  };
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
