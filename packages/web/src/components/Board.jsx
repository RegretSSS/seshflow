import React, { useEffect, useState } from 'react';
import Column from './Column';
import TaskDetail from './TaskDetail';
import '../styles/Board.css';

function emptySnapshot() {
  return {
    workspace: null,
    columns: [],
    tasks: [],
    tasksByStatus: {},
    currentTask: null,
    runtimeEvents: [],
    transitions: [],
    focus: 'next-ready-task',
  };
}

function groupTasksByStatus(columns, tasks = []) {
  const grouped = Object.fromEntries(columns.map(column => [column.id, []]));
  tasks.forEach(task => {
    const key = grouped[task.status] ? task.status : 'backlog';
    grouped[key].push(task);
  });
  return grouped;
}

function sortTasks(items = []) {
  const weights = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return [...items].sort((a, b) => {
    const priorityDelta = (weights[a.priority] ?? 9) - (weights[b.priority] ?? 9);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

const Board = () => {
  const [snapshot, setSnapshot] = useState(emptySnapshot());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSnapshot() {
      setError('');

      try {
        const response = await fetch('/api/seshflow/workspace');
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        const tasks = payload.tasks || [];
        const columns = payload.columns || [];
        const grouped = groupTasksByStatus(columns, tasks);
        Object.keys(grouped).forEach(key => {
          grouped[key] = sortTasks(grouped[key]);
        });

        setSnapshot({
          workspace: payload.workspace || null,
          columns,
          tasks,
          tasksByStatus: grouped,
          currentTask: payload.currentTask || null,
          runtimeEvents: payload.runtimeEvents || [],
          transitions: payload.transitions || [],
          focus: payload.focus || 'next-ready-task',
        });

        setSelectedTask(previousSelected => {
          if (!previousSelected) {
            return payload.currentTask || tasks[0] || null;
          }
          return tasks.find(task => task.id === previousSelected.id) || payload.currentTask || null;
        });
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Failed to load workspace snapshot');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSnapshot();
    const intervalId = window.setInterval(loadSnapshot, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const totalTasks = snapshot.tasks.length;

  if (loading) {
    return <div className="board-loading">Loading control plane...</div>;
  }

  if (error) {
    return (
      <div className="board-error">
        <h1>Control plane unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="board">
      <header className="board-header">
        <div>
          <p className="board-kicker">Runtime-backed workspace view</p>
          <h1 className="board-title">Seshflow Control Plane</h1>
          <p className="board-subtitle">
            {snapshot.workspace?.name || 'workspace'}
            {' '}
            | source=
            {snapshot.workspace?.source || 'unknown'}
            {' '}
            | branch=
            {snapshot.workspace?.gitBranch || 'n/a'}
          </p>
        </div>

        <div className="board-stats">
          <span className="board-stat">tasks={totalTasks}</span>
          <span className="board-stat">events={snapshot.runtimeEvents.length}</span>
          <span className="board-stat">transitions={snapshot.transitions.length}</span>
        </div>
      </header>

      <section className="board-summary">
        <article className="summary-panel">
          <h2>Current focus</h2>
          {snapshot.currentTask ? (
            <>
              <strong>{snapshot.currentTask.title}</strong>
              <span>
                {snapshot.currentTask.id}
                {' '}
                | {snapshot.currentTask.status}
                {' '}
                | {snapshot.currentTask.priority}
              </span>
              <span>focus={snapshot.focus}</span>
              <span>runtime={snapshot.currentTask.runtimeSummary?.recordCount || 0}</span>
              <span>processes={snapshot.currentTask.processSummary?.recordCount || 0}</span>
              <button
                type="button"
                className="summary-link"
                onClick={() => setSelectedTask(snapshot.currentTask)}
              >
                Open task detail
              </button>
            </>
          ) : (
            <>
              <strong>No active task</strong>
              <span>focus={snapshot.focus}</span>
              <span>Use CLI start/next to move the workspace forward.</span>
            </>
          )}
        </article>

        <article className="summary-panel">
          <h2>Recent runtime events</h2>
          {snapshot.runtimeEvents.length > 0 ? (
            snapshot.runtimeEvents.slice(-4).reverse().map(event => (
              <div key={event.id} className={`event-line level-${event.level}`}>
                <strong>{event.type}</strong>
                <span>
                  {event.taskId || 'workspace'}
                  {' '}
                  | {event.status}
                </span>
              </div>
            ))
          ) : (
            <span>No runtime events yet</span>
          )}
        </article>
      </section>

      <section className="board-columns">
        {snapshot.columns.map(column => (
          <Column
            key={column.id}
            column={column}
            tasks={snapshot.tasksByStatus[column.id] || []}
            onCardClick={setSelectedTask}
          />
        ))}
      </section>

      {selectedTask ? (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      ) : null}
    </div>
  );
};

export default Board;
