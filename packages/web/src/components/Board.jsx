import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import Column from './Column';
import TaskDetail from './TaskDetail';
import '../styles/Board.css';

const Board = () => {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const mockColumns = [
      { id: 'backlog', name: 'Backlog', color: '#94a3b8' },
      { id: 'todo', name: 'Todo', color: '#3b82f6' },
      { id: 'in-progress', name: 'In Progress', color: '#eab308' },
      { id: 'review', name: 'Review', color: '#8b5cf6' },
      { id: 'done', name: 'Done', color: '#22c55e' },
      { id: 'blocked', name: 'Blocked', color: '#ef4444' },
    ];

    const mockTasks = {
      backlog: [],
      todo: [
        {
          id: 'task-1',
          title: 'Implement authentication',
          description: 'Build login and signup flow with JWT.',
          status: 'todo',
          priority: 'P0',
          tags: ['auth', 'backend'],
          estimatedHours: 4,
          assignee: 'John',
          subtasks: [
            { id: 'st-1', title: 'Design API', completed: true },
            { id: 'st-2', title: 'Implement login', completed: false },
          ],
          gitCommits: [],
          sessions: [],
          context: {
            relatedFiles: ['src/auth/routes.js'],
            commands: ['npm test'],
            links: [],
          },
        },
      ],
      'in-progress': [
        {
          id: 'task-2',
          title: 'Design database schema',
          description: 'Draft tables for users, tasks, and sessions.',
          status: 'in-progress',
          priority: 'P1',
          tags: ['database'],
          estimatedHours: 3,
          assignee: 'Jane',
          subtasks: [{ id: 'st-3', title: 'users table', completed: true }],
          gitCommits: [],
          sessions: [],
          context: {
            relatedFiles: ['docs/database.sql'],
            commands: [],
            links: [],
          },
        },
      ],
      review: [],
      done: [],
      blocked: [],
    };

    setColumns(mockColumns);
    setTasks(mockTasks);
    setLoading(false);
  }, []);

  const handleDragEnd = (result) => {
    const { destination, source } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (source.droppableId === destination.droppableId) {
      const columnTasks = [...tasks[source.droppableId]];
      const [removedTask] = columnTasks.splice(source.index, 1);
      columnTasks.splice(destination.index, 0, removedTask);

      setTasks({
        ...tasks,
        [source.droppableId]: columnTasks,
      });
      return;
    }

    const sourceTasks = [...tasks[source.droppableId]];
    const destinationTasks = [...tasks[destination.droppableId]];
    const [removedTask] = sourceTasks.splice(source.index, 1);
    removedTask.status = destination.droppableId;
    destinationTasks.splice(destination.index, 0, removedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destinationTasks,
    });

    // TODO: call API to persist task status update.
  };

  const handleCardClick = (task) => {
    setSelectedTask(task);
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  if (loading) {
    return <div className="board-loading">Loading...</div>;
  }

  return (
    <div className="board">
      <div className="board-header">
        <h1 className="board-title">Seshflow Task Board</h1>
        <div className="board-stats">
          <span className="board-stat">Total Tasks: {Object.values(tasks).flat().length}</span>
        </div>
      </div>

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

      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={handleCloseDetail} />
      )}
    </div>
  );
};

export default Board;
