import React from 'react';
import PropTypes from 'prop-types';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';
import '../styles/Column.css';

/**
 * Column 组件 - 看板中的单列
 * 显示列头（名称+任务数）、任务列表容器、拖放区域
 */
const Column = ({ column, tasks, onCardClick }) => {
  const taskCount = tasks.length;

  return (
    <div className="column">
      {/* 列头 */}
      <div className="column-header" style={{ backgroundColor: column.color }}>
        <h3 className="column-title">{column.name}</h3>
        <span className="column-count">{taskCount}</span>
      </div>

      {/* 拖放区域 */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            className={`column-content ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
            {...provided.droppableProps}
          >
            {/* 任务列表 */}
            {tasks.map((task, index) => (
              <Card
                key={task.id}
                task={task}
                index={index}
                onClick={() => onCardClick(task)}
              />
            ))}

            {/* 拖放占位符 */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

Column.propTypes = {
  column: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  }).isRequired,
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      status: PropTypes.string.isRequired,
      priority: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      estimatedHours: PropTypes.number,
      actualHours: PropTypes.number,
      assignee: PropTypes.string,
    })
  ).isRequired,
  onCardClick: PropTypes.func,
};

Column.defaultProps = {
  onCardClick: () => {},
};

export default Column;
