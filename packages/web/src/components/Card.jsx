import PropTypes from 'prop-types';
import { getMessage } from '../i18n';
import '../styles/Card.css';

const PRIORITY_COLORS = {
  P0: '#ef4444',
  P1: '#f97316',
  P2: '#eab308',
  P3: '#3b82f6',
};

const Card = ({ task, locale, onClick = () => {} }) => {
  const subtaskTotal = task.subtasks?.length || 0;
  const subtaskDone = task.subtasks?.filter(item => item.completed).length || 0;

  return (
    <button type="button" className="card" onClick={onClick}>
      <span
        className="card-priority"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#94a3b8' }}
      />
      <div className="card-content">
        <div className="card-head">
          <strong className="card-title">{task.title}</strong>
          <span className="card-status">{task.priority}</span>
        </div>

        {task.tags?.length ? (
          <div className="card-tags">
            {task.tags.slice(0, 4).map(tag => (
              <span key={tag} className="card-tag">{tag}</span>
            ))}
          </div>
        ) : null}

        <div className="card-meta">
          <span>{task.id}</span>
          {subtaskTotal ? <span>{getMessage(locale, 'subtasks')}={subtaskDone}/{subtaskTotal}</span> : null}
          {task.estimatedHours ? <span>{task.estimatedHours}h</span> : null}
        </div>
      </div>
    </button>
  );
};

Card.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    priority: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    subtasks: PropTypes.arrayOf(PropTypes.shape({
      completed: PropTypes.bool,
    })),
    estimatedHours: PropTypes.number,
  }).isRequired,
  locale: PropTypes.oneOf(['en', 'zh']).isRequired,
  onClick: PropTypes.func,
};

export default Card;
