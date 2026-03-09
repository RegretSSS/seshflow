import React from 'react';
import PropTypes from 'prop-types';
import Card from './Card';
import '../styles/Column.css';

const Column = ({ column, tasks, onCardClick }) => {
  return (
    <section className="column">
      <div className="column-header" style={{ backgroundColor: column.color }}>
        <h3 className="column-title">{column.name}</h3>
        <span className="column-count">{tasks.length}</span>
      </div>

      <div className="column-content">
        {tasks.length > 0 ? tasks.map((task) => (
          <Card key={task.id} task={task} onClick={() => onCardClick(task)} />
        )) : (
          <div className="column-empty">No tasks</div>
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
  onCardClick: PropTypes.func,
};

Column.defaultProps = {
  onCardClick: () => {},
};

export default Column;
