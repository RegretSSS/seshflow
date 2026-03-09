import PropTypes from 'prop-types';
import Card from './Card';
import { getMessage, getStatusLabel } from '../i18n';
import '../styles/Column.css';

const Column = ({ column, tasks, locale, onCardClick = () => {} }) => {
  return (
    <section className="column">
      <div className="column-header" style={{ backgroundColor: column.color }}>
        <h3 className="column-title">{getStatusLabel(locale, column.id) || column.name}</h3>
        <span className="column-count">{tasks.length}</span>
      </div>

      <div className="column-content">
        {tasks.length > 0 ? tasks.map((task) => (
          <Card key={task.id} task={task} locale={locale} onClick={() => onCardClick(task)} />
        )) : (
          <div className="column-empty">{getMessage(locale, 'noTasks')}</div>
        )}
      </div>
    </section>
  );
};

Column.propTypes = {
  column: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  }).isRequired,
  tasks: PropTypes.arrayOf(PropTypes.object).isRequired,
  locale: PropTypes.oneOf(['en', 'zh']).isRequired,
  onCardClick: PropTypes.func,
};

export default Column;
