import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import Column from './Column';
import TaskDetail from './TaskDetail';
import '../styles/Board.css';

/**
 * Board 组件 - Trello 风格主看板
 */
const Board = () => {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    // TODO: 从 API 加载数据
    // 临时使用模拟数据
    const mockColumns = [
      { id: 'backlog', name: '待办池', color: '#94a3b8' },
      { id: 'todo', name: '准备做', color: '#3b82f6' },
      { id: 'in-progress', name: '进行中', color: '#eab308' },
      { id: 'review', name: '审核', color: '#8b5cf6' },
      { id: 'done', name: '完成', color: '#22c55e' },
      { id: 'blocked', name: '阻塞', color: '#ef4444' },
    ];

    const mockTasks = {
      'backlog': [],
      'todo': [
        {
          id: 'task-1',
          title: '实现用户认证',
          description: '# 实现用户认证\n\n## 目标\n实现 JWT 认证系统\n\n## 任务列表\n- [x] 设计 API 接口\n- [ ] 实现登录逻辑\n- [ ] 实现注册逻辑\n- [ ] 添加 JWT 验证中间件\n\n## 技术栈\n- Node.js\n- Express\n- JWT\n- bcrypt',
          status: 'todo',
          priority: 'P0',
          tags: ['auth', 'backend'],
          estimatedHours: 4,
          assignee: 'John',
          subtasks: [
            { id: 'st-1', title: '设计 API 接口', completed: true },
            { id: 'st-2', title: '实现登录逻辑', completed: false },
            { id: 'st-3', title: '实现注册逻辑', completed: false },
            { id: 'st-4', title: '添加 JWT 验证中间件', completed: false },
          ],
          gitCommits: [
            { hash: 'abc123', message: 'feat: 设计认证 API', timestamp: '2026-03-05T10:00:00Z' },
          ],
          sessions: [
            {
              id: 'sess-1',
              startedAt: '2026-03-05T09:00:00Z',
              endedAt: '2026-03-05T11:00:00Z',
              note: '完成 API 接口设计',
            },
          ],
          context: {
            relatedFiles: ['src/auth/routes.js', 'src/auth/middleware.js'],
            commands: ['npm test'],
            links: [],
          },
        },
      ],
      'in-progress': [
        {
          id: 'task-2',
          title: '设计数据库架构',
          description: '设计 PostgreSQL 数据库结构\n\n## 表结构\n- users (用户表)\n- tasks (任务表)\n- sessions (会话表)',
          status: 'in-progress',
          priority: 'P1',
          tags: ['database', 'design'],
          estimatedHours: 3,
          assignee: 'Jane',
          subtasks: [
            { id: 'st-5', title: '设计用户表', completed: true },
            { id: 'st-6', title: '设计任务表', completed: true },
            { id: 'st-7', title: '设计关系表', completed: false },
          ],
          gitCommits: [],
          sessions: [],
          context: {
            relatedFiles: ['docs/database.sql'],
            commands: [],
            links: [],
          },
        },
      ],
      'review': [],
      'done': [
        {
          id: 'task-3',
          title: '初始化项目',
          description: '创建项目基础结构\n\n- ✅ 创建仓库\n- ✅ 配置开发环境\n- ✅ 搭建基础框架',
          status: 'done',
          priority: 'P2',
          tags: ['setup'],
          estimatedHours: 2,
          actualHours: 2,
          assignee: 'Alice',
          subtasks: [
            { id: 'st-8', title: '创建仓库', completed: true },
            { id: 'st-9', title: '配置开发环境', completed: true },
          ],
          gitCommits: [
            { hash: 'def456', message: 'chore: 初始化项目', timestamp: '2026-03-04T10:00:00Z' },
          ],
          sessions: [
            {
              id: 'sess-2',
              startedAt: '2026-03-04T09:00:00Z',
              endedAt: '2026-03-04T11:00:00Z',
              note: '完成项目初始化',
            },
          ],
          context: {
            relatedFiles: ['package.json', 'README.md'],
            commands: [],
            links: [],
          },
        },
      ],
      'blocked': [],
    };

    setColumns(mockColumns);
    setTasks(mockTasks);
    setLoading(false);
  }, []);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // 没有有效的拖放目标
    if (!destination) return;

    // 拖放到同一位置
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // 获取源列和目标列的任务
    const sourceTasks = [...tasks[source.droppableId]];
    const destinationTasks = [...tasks[destination.droppableId]];

    // 从源列移除任务
    const [removedTask] = sourceTasks.splice(source.index, 1);

    // 更新任务状态
    removedTask.status = destination.droppableId;

    // 添加到目标列
    destinationTasks.splice(destination.index, 0, removedTask);

    // 更新状态
    setTasks({
      ...tasks,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destinationTasks,
    });

    // TODO: 调用 API 更新任务状态
  };

  const handleCardClick = (task) => {
    setSelectedTask(task);
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  if (loading) {
    return <div className="board-loading">加载中...</div>;
  }

  return (
    <div className="board">
      {/* 头部信息栏 */}
      <div className="board-header">
        <h1 className="board-title">Seshflow 任务看板</h1>
        <div className="board-stats">
          <span className="board-stat">
            总任务: {Object.values(tasks).flat().length}
          </span>
        </div>
      </div>

      {/* 看板列 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={tasks[column.id] || []}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </DragDropContext>

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={handleCloseDetail} />
      )}
    </div>
  );
};

export default Board;
