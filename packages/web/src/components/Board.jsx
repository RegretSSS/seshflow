import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Column from './Column';
import TaskDetail from './TaskDetail';
import { getMessage } from '../i18n';
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

const Board = ({ locale, onLocaleChange }) => {
  const [snapshot, setSnapshot] = useState(emptySnapshot());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const initializedSelectionRef = useRef(false);

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

        setSelectedTaskId(previousSelectedId => {
          if (previousSelectedId && tasks.some(task => task.id === previousSelectedId)) {
            return previousSelectedId;
          }

          if (!initializedSelectionRef.current && payload.currentTask?.id) {
            initializedSelectionRef.current = true;
            return payload.currentTask.id;
          }

          initializedSelectionRef.current = true;
          return null;
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
  const selectedTask = useMemo(
    () => snapshot.tasks.find(task => task.id === selectedTaskId) || null,
    [snapshot.tasks, selectedTaskId]
  );

  if (loading) {
    return <div className="board-loading">{getMessage(locale, 'loading')}</div>;
  }

  if (error) {
    return (
      <div className="board-error">
        <h1>{getMessage(locale, 'unavailable')}</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="board">
      <header className="board-header">
        <div>
          <p className="board-kicker">{getMessage(locale, 'kicker')}</p>
          <h1 className="board-title">{getMessage(locale, 'title')}</h1>
          <p className="board-subtitle">
            {snapshot.workspace?.name || getMessage(locale, 'workspaceFallback')}
            {' | '}
            {getMessage(locale, 'source')}={snapshot.workspace?.source || getMessage(locale, 'unknown')}
            {' | '}
            {getMessage(locale, 'branch')}={snapshot.workspace?.gitBranch || getMessage(locale, 'notAvailable')}
          </p>
        </div>

        <div className="board-toolbar">
          <div className="board-stats">
            <span className="board-stat">{getMessage(locale, 'tasks')}={totalTasks}</span>
            <span className="board-stat">{getMessage(locale, 'events')}={snapshot.runtimeEvents.length}</span>
            <span className="board-stat">{getMessage(locale, 'transitions')}={snapshot.transitions.length}</span>
          </div>

          <div className="locale-toggle" role="group" aria-label={getMessage(locale, 'localeLabel')}>
            <button
              type="button"
              className={`locale-button ${locale === 'en' ? 'active' : ''}`}
              onClick={() => onLocaleChange('en')}
            >
              {getMessage(locale, 'english')}
            </button>
            <button
              type="button"
              className={`locale-button ${locale === 'zh' ? 'active' : ''}`}
              onClick={() => onLocaleChange('zh')}
            >
              {getMessage(locale, 'chinese')}
            </button>
          </div>
        </div>
      </header>

      <section className="board-summary">
        <article className="summary-panel">
          <h2>{getMessage(locale, 'currentFocus')}</h2>
          {snapshot.currentTask ? (
            <>
              <strong>{snapshot.currentTask.title}</strong>
              <span>
                {snapshot.currentTask.id}
                {' | '}
                {snapshot.currentTask.status}
                {' | '}
                {snapshot.currentTask.priority}
              </span>
              <span>{getMessage(locale, 'focus')}={snapshot.focus}</span>
              <span>{getMessage(locale, 'runtime')}={snapshot.currentTask.runtimeSummary?.recordCount || 0}</span>
              <span>{getMessage(locale, 'processes')}={snapshot.currentTask.processSummary?.recordCount || 0}</span>
              <button
                type="button"
                className="summary-link"
                onClick={() => setSelectedTaskId(snapshot.currentTask.id)}
              >
                {getMessage(locale, 'openTaskDetail')}
              </button>
            </>
          ) : (
            <>
              <strong>{getMessage(locale, 'noActiveTask')}</strong>
              <span>{getMessage(locale, 'focus')}={snapshot.focus}</span>
              <span>{getMessage(locale, 'useCliHint')}</span>
            </>
          )}
        </article>

        <article className="summary-panel">
          <h2>{getMessage(locale, 'recentRuntimeEvents')}</h2>
          {snapshot.runtimeEvents.length > 0 ? (
            snapshot.runtimeEvents.slice(-4).reverse().map(event => (
              <div key={event.id} className={`event-line level-${event.level}`}>
                <strong>{event.type}</strong>
                <span>
                  {event.taskId || getMessage(locale, 'workspaceFallback')}
                  {' | '}
                  {event.status}
                </span>
              </div>
            ))
          ) : (
            <span>{getMessage(locale, 'noRuntimeEvents')}</span>
          )}
        </article>
      </section>

      <section className="board-columns">
        {snapshot.columns.map(column => (
          <Column
            key={column.id}
            column={column}
            tasks={snapshot.tasksByStatus[column.id] || []}
            locale={locale}
            onCardClick={task => setSelectedTaskId(task.id)}
          />
        ))}
      </section>

      {selectedTask ? (
        <TaskDetail task={selectedTask} locale={locale} onClose={() => setSelectedTaskId(null)} />
      ) : null}
    </div>
  );
};

Board.propTypes = {
  locale: PropTypes.oneOf(['en', 'zh']).isRequired,
  onLocaleChange: PropTypes.func.isRequired,
};

export default Board;
