import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { getMessage, getStatusLabel } from '../i18n';
import '../styles/TaskDetail.css';

function formatTimestamp(value, locale) {
  if (!value) {
    return getMessage(locale, 'notAvailable');
  }
  return new Date(value).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
}

function renderList(items, emptyLabel, renderItem) {
  if (!items?.length) {
    return <p className="no-content">{emptyLabel}</p>;
  }

  return <div className="detail-list">{items.map(renderItem)}</div>;
}

const TaskDetail = ({ task, locale, onClose }) => {
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
      <section className="task-detail-modal" onClick={event => event.stopPropagation()}>
        <header className="task-detail-header">
          <div className="task-detail-header-content">
            <p className="task-detail-kicker">{task.id}</p>
            <h2 className="task-detail-title">{task.title}</h2>
            <div className="task-detail-meta">
              <span className={`task-priority priority-${task.priority || 'P3'}`}>
                {task.priority || 'P3'}
              </span>
              <span className="task-status">{getStatusLabel(locale, task.status)}</span>
              <span className="task-chip">{getMessage(locale, 'depends')}={task.dependencies?.length || 0}</span>
              <span className="task-chip">{getMessage(locale, 'blocked')}={task.unmetDependencies?.length || 0}</span>
            </div>
          </div>
          <button type="button" className="task-detail-close" onClick={onClose} aria-label={getMessage(locale, 'close')}>
            ×
          </button>
        </header>

        <div className="task-detail-content">
          <section className="task-detail-section">
            <h3 className="section-title">{getMessage(locale, 'description')}</h3>
            {task.description ? (
              <ReactMarkdown className="markdown-content">
                {task.description}
              </ReactMarkdown>
            ) : (
              <p className="no-content">{getMessage(locale, 'noDescription')}</p>
            )}
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">{getMessage(locale, 'executionSummary')}</h3>
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-label">{getMessage(locale, 'runtime')}</span>
                <strong>{task.runtimeSummary?.recordCount || 0}</strong>
                <span>{task.runtimeSummary?.lastCommand || getMessage(locale, 'noRecordedCommand')}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">{getMessage(locale, 'processes')}</span>
                <strong>{task.processSummary?.recordCount || 0}</strong>
                <span>running={task.processSummary?.runningCount || 0} missing={task.processSummary?.missingCount || 0}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">{getMessage(locale, 'runtimeEventsLabel')}</span>
                <strong>{task.runtimeEventSummary?.recordCount || 0}</strong>
                <span>{task.runtimeEventSummary?.lastEventType || getMessage(locale, 'noEventsYet')}</span>
              </div>
            </div>
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">{getMessage(locale, 'recentRuntimeRecords')}</h3>
            {renderList(
              runtimeRuns,
              getMessage(locale, 'noRuntimeRecords'),
              run => (
                <article key={run.id} className="detail-card">
                  <strong>{run.command || getMessage(locale, 'manualNote')}</strong>
                  <span>{run.cwd || 'cwd=n/a'}</span>
                  <span>{run.note || getMessage(locale, 'noNote')}</span>
                  <span>{getMessage(locale, 'recorded')}={formatTimestamp(run.recordedAt, locale)}</span>
                </article>
              )
            )}
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">{getMessage(locale, 'recentProcesses')}</h3>
            {renderList(
              processEntries,
              getMessage(locale, 'noProcessRecords'),
              process => (
                <article key={process.id} className="detail-card">
                  <strong>{process.command || 'process'}</strong>
                  <span>{getMessage(locale, 'pid')}={process.pid || getMessage(locale, 'notAvailable')} | {getMessage(locale, 'state')}={process.state || getMessage(locale, 'unknown')}</span>
                  <span>{getMessage(locale, 'started')}={formatTimestamp(process.startedAt, locale)}</span>
                  <span>{process.outputRoot || process.note || getMessage(locale, 'noExtraContext')}</span>
                </article>
              )
            )}
          </section>

          <section className="task-detail-section">
            <h3 className="section-title">{getMessage(locale, 'recentTaskRuntimeEvents')}</h3>
            {renderList(
              runtimeEvents,
              getMessage(locale, 'noRuntimeEvents'),
              event => (
                <article key={event.id} className={`detail-card event-card level-${event.level || 'info'}`}>
                  <strong>{event.type}</strong>
                  <span>{event.message || getMessage(locale, 'noNote')}</span>
                  <span>{getMessage(locale, 'status')}={event.status || 'recorded'} | {getMessage(locale, 'attempts')}={event.attempts || 0}</span>
                  <span>{getMessage(locale, 'occurred')}={formatTimestamp(event.occurredAt, locale)}</span>
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
      recordCount: PropTypes.number,
      lastEventType: PropTypes.string,
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
  locale: PropTypes.oneOf(['en', 'zh']).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TaskDetail;
