import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import '../styles/TaskDetail.css';

/**
 * TaskDetail 组件 - 任务详情弹窗
 * 显示任务描述、子任务、Git提交、会话历史、相关文件
 */
const TaskDetail = ({ task, onClose }) => {
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(false);

  // 切换标签页
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 渲染内容
  const renderContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <div className="task-detail-section">
            <h3 className="section-title">任务描述</h3>
            {task.description ? (
              <ReactMarkdown className="markdown-content">
                {task.description}
              </ReactMarkdown>
            ) : (
              <p className="no-content">暂无描述</p>
            )}
          </div>
        );

      case 'subtasks':
        return (
          <div className="task-detail-section">
            <h3 className="section-title">子任务列表</h3>
            {task.subtasks && task.subtasks.length > 0 ? (
              <ul className="subtasks-list">
                {task.subtasks.map((subtask) => (
                  <li key={subtask.id} className="subtask-item">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      readOnly
                      className="subtask-checkbox"
                    />
                    <span
                      className={`subtask-title ${
                        subtask.completed ? 'completed' : ''
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-content">暂无子任务</p>
            )}
          </div>
        );

      case 'commits':
        return (
          <div className="task-detail-section">
            <h3 className="section-title">Git 提交记录</h3>
            {task.gitCommits && task.gitCommits.length > 0 ? (
              <ul className="commits-list">
                {task.gitCommits.map((commit, index) => (
                  <li key={index} className="commit-item">
                    <code className="commit-hash">{commit.hash}</code>
                    <span className="commit-message">{commit.message}</span>
                    <span className="commit-time">
                      {new Date(commit.timestamp).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-content">暂无提交记录</p>
            )}
          </div>
        );

      case 'sessions':
        return (
          <div className="task-detail-section">
            <h3 className="section-title">会话历史</h3>
            {task.sessions && task.sessions.length > 0 ? (
              <ul className="sessions-list">
                {task.sessions.map((session) => (
                  <li key={session.id} className="session-item">
                    <div className="session-header">
                      <span className="session-id">{session.id}</span>
                      <span className="session-time">
                        {new Date(session.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {session.note && (
                      <p className="session-note">{session.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-content">暂无会话记录</p>
            )}
          </div>
        );

      case 'files':
        return (
          <div className="task-detail-section">
            <h3 className="section-title">相关文件</h3>
            {task.context?.relatedFiles &&
            task.context.relatedFiles.length > 0 ? (
              <ul className="files-list">
                {task.context.relatedFiles.map((file, index) => (
                  <li key={index} className="file-item">
                    📄 {file}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-content">暂无相关文件</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="task-detail-header">
          <div className="task-detail-header-content">
            <h2 className="task-detail-title">{task.title}</h2>
            <div className="task-detail-meta">
              <span className={`task-priority priority-${task.priority}`}>
                {task.priority}
              </span>
              <span className="task-status">{task.status}</span>
              {task.assignee && (
                <span className="task-assignee">👤 {task.assignee}</span>
              )}
            </div>
          </div>
          <button className="task-detail-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 标签页 */}
        <div className="task-detail-tabs">
          <button
            className={`tab-button ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => handleTabChange('description')}
          >
            📝 描述
          </button>
          <button
            className={`tab-button ${activeTab === 'subtasks' ? 'active' : ''}`}
            onClick={() => handleTabChange('subtasks')}
          >
            ✓ 子任务
          </button>
          <button
            className={`tab-button ${activeTab === 'commits' ? 'active' : ''}`}
            onClick={() => handleTabChange('commits')}
          >
            🔀 提交
          </button>
          <button
            className={`tab-button ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => handleTabChange('sessions')}
          >
            💬 会话
          </button>
          <button
            className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => handleTabChange('files')}
          >
            📁 文件
          </button>
        </div>

        {/* 内容区域 */}
        <div className="task-detail-content">{renderContent()}</div>

        {/* 底部 */}
        {task.estimatedHours && (
          <div className="task-detail-footer">
            <span className="task-time">
              ⏱ 预估: {task.estimatedHours}h
            </span>
            {task.actualHours && (
              <span className="task-time">
                ⏰ 实际: {task.actualHours}h
              </span>
            )}
          </div>
        )}
      </div>
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
    tags: PropTypes.arrayOf(PropTypes.string),
    subtasks: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        completed: PropTypes.bool,
      })
    ),
    gitCommits: PropTypes.arrayOf(
      PropTypes.shape({
        hash: PropTypes.string,
        message: PropTypes.string,
        timestamp: PropTypes.string,
      })
    ),
    sessions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        startedAt: PropTypes.string.isRequired,
        endedAt: PropTypes.string,
        note: PropTypes.string,
      })
    ),
    context: PropTypes.shape({
      relatedFiles: PropTypes.arrayOf(PropTypes.string),
      commands: PropTypes.arrayOf(PropTypes.string),
      links: PropTypes.arrayOf(PropTypes.string),
    }),
    estimatedHours: PropTypes.number,
    actualHours: PropTypes.number,
    assignee: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TaskDetail;
