import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import '../styles/TaskDetail.css';

function formatTimestamp(value) {
  if (!value) {
    return 'n/a';
  }
  return new Date(value).toLocaleString();
}

function renderList(items, emptyLabel, renderItem) {
  if (!items?.length) {
    return <p className="no-content">{emptyLabel}</p>;
  }

  return <div className="detail-list">{items.map(renderItem)}</div>;
}

const TaskDetail = ({ task, onClose }) => {
  const runtimeRuns = task.recentRuns || [];
  const processEntries = task.recentProcesses || [];
  const runtimeEvents = task.recentRuntimeEvents || [];

  return (
    <div
      className="task-detail-overlay"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        className="task-detail-modal"
        onClick={event => event.stopPropagation()}
      >
        <header className="task-detail-header">
          <div className="task-detail-header-content">
            <p className="task-detail-kicker">{task.id}</p>
            <h2 className="task-detail-title">{task.title}</h2>
            <div className="task-detail-meta">
              <span className={`task-priority priority-${task.priority || 'P3'}`}>
                {task.priority || 'P3'}
              </span>
              <span className="task-status">{task.status}</span>
              <span className="task-chip">depends={task.dependencies?.length || 0}</span>
              <span className="task-chip">blocked={task.unmetDependencies?.length || 0}</span>
            </div>
          </div>
          <button type="button" className="task-detail-close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="task-detail-content">
          <section className="task-detail-section">
            <h3 className="section-title">Description</h3>
            {task.description ? (
              <ReactMarkdown className="markdown-content">
                {task.description}
              </ReactMarkdown>
            ) : (
              <p className="no-content">No description</p>
            )}
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">Execution summary</h3>
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-label">Runtime</span>
                <strong>{task.runtimeSummary?.recordCount || 0}</strong>
                <span>{task.runtimeSummary?.lastCommand || 'No recorded command'}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Processes</span>
                <strong>{task.processSummary?.recordCount || 0}</strong>
                <span>
                  running={task.processSummary?.runningCount || 0}
                  {' '}
                  missing={task.processSummary?.missingCount || 0}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Runtime events</span>
                <strong>{task.runtimeEventSummary?.recordCount || 0}</strong>
                <span>{task.runtimeEventSummary?.lastEventType || 'No events yet'}</span>
              </div>
            </div>
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">Recent runtime records</h3>
            {renderList(
              runtimeRuns,
              'No runtime records',
              run => (
                <article key={run.id} className="detail-card">
                  <strong>{run.command || 'manual note'}</strong>
                  <span>{run.cwd || 'cwd=n/a'}</span>
                  <span>{run.note || 'No note'}</span>
                  <span>recorded={formatTimestamp(run.recordedAt)}</span>
                </article>
              )
            )}
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">Recent processes</h3>
            {renderList(
              processEntries,
              'No process records',
              process => (
                <article key={process.id} className="detail-card">
                  <strong>{process.command || 'process'}</strong>
                  <span>
                    pid={process.pid || 'n/a'}
                    {' '}
                    | state={process.state || 'unknown'}
                  </span>
                  <span>started={formatTimestamp(process.startedAt)}</span>
                  <span>{process.outputRoot || process.note || 'No extra context'}</span>
                </article>
              )
            )}
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">Recent runtime events</h3>
            {renderList(
              runtimeEvents,
              'No runtime events',
              event => (
                <article key={event.id} className={`detail-card event-card level-${event.level || 'info'}`}>
                  <strong>{event.type}</strong>
                  <span>{event.message || 'No message'}</span>
                  <span>
                    status={event.status || 'recorded'}
                    {' '}
                    | attempts={event.attempts || 0}
                  </span>
                  <span>occurred={formatTimestamp(event.occurredAt)}</span>
                </article>
              )
            )}
          </section>
        </div>
      </section>
    </div>
  );
};

TaskDetail.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    priority: PropTypes.string,
    dependencies: PropTypes.arrayOf(PropTypes.string),
    unmetDependencies: PropTypes.arrayOf(PropTypes.string),
    runtimeSummary: PropTypes.shape({
      recordCount: PropTypes.number,
      lastCommand: PropTypes.string,
    }),
    processSummary: PropTypes.shape({
      recordCount: PropTypes.number,
      runningCount: PropTypes.number,
      missingCount: PropTypes.number,
    }),
    runtimeEventSummary: PropTypes.shape({
      count: PropTypes.number,
      lastType: PropTypes.string,
    }),
    recentRuns: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      command: PropTypes.string,
      cwd: PropTypes.string,
      note: PropTypes.string,
      recordedAt: PropTypes.string,
    })),
    recentProcesses: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      command: PropTypes.string,
      state: PropTypes.string,
      outputRoot: PropTypes.string,
      note: PropTypes.string,
      startedAt: PropTypes.string,
    })),
    recentRuntimeEvents: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string,
      message: PropTypes.string,
      status: PropTypes.string,
      attempts: PropTypes.number,
      occurredAt: PropTypes.string,
      level: PropTypes.string,
    })),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TaskDetail;
