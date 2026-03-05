import React from 'react';
import PropTypes from 'prop-types';
import { Draggable } from 'react-beautiful-dnd';
import '../styles/Card.css';

/**
 * Card 组件 - 任务卡片
 * 显示标题、标签、优先级、子任务进度、分配人信息
 */
const Card = ({ task, index, onClick }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      P0: '#ef4444',
      P1: '#f97316',
      P2: '#eab308',
      P3: '#22c55e',
    };
    return colors[priority] || '#94a3b8';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      P0: '紧急',
      P1: '高',
      P2: '中',
      P3: '低',
    };
    return labels[priority] || priority;
  };

  // 计算子任务进度
  const getSubtaskProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return null;
    }
    const completed = task.subtasks.filter(st => st.completed).length;
    const total = task.subtasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  };

  const subtaskProgress = getSubtaskProgress();

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          className={`card ${snapshot.isDragging ? 'is-dragging' : ''}`}
          onClick={onClick}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {/* 优先级指示器 */}
          <div
            className="card-priority"
            style={{ backgroundColor: getPriorityColor(task.priority) }}
            title={getPriorityLabel(task.priority)}
          />

          {/* 卡片内容 */}
          <div className="card-content">
            <h4 className="card-title">{task.title}</h4>

            {/* 标签 */}
            {task.tags && task.tags.length > 0 && (
              <div className="card-tags">
                {task.tags.map((tag) => (
                  <span key={tag} className="card-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 子任务进度 */}
            {subtaskProgress && (
              <div className="card-subtasks">
                <div className="subtasks-info">
                  <span className="subtasks-text">
                    ✓ {subtaskProgress.completed}/{subtaskProgress.total}
                  </span>
                  <span className="subtasks-percentage">
                    {subtaskProgress.percentage}%
                  </span>
                </div>
                <div className="subtasks-progress-bar">
                  <div
                    className="subtasks-progress-fill"
                    style={{ width: `${subtaskProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* 底部信息 */}
            <div className="card-footer">
              {/* 工时信息 */}
              {task.estimatedHours && (
                <span className="card-time" title="预估工时">
                  ⏱ {task.estimatedHours}h
                </span>
              )}

              {/* 分配人 */}
              {task.assignee && (
                <span className="card-assignee" title="分配给">
                  👤 {task.assignee}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

Card.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    priority: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    subtasks: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        completed: PropTypes.bool,
      })
    ),
    estimatedHours: PropTypes.number,
    actualHours: PropTypes.number,
    assignee: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onClick: PropTypes.func,
};

Card.defaultProps = {
  onClick: () => {},
};

export default Card;
