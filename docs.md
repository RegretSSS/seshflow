# Seshflow - 跨对话任务序列器

## 完整技术规划文档

---

## 一、项目概述

**Seshflow** 是一个轻量级任务管理工具，专为**跨对话的AI辅助开发**设计。它在Git仓库中维护带依赖关系的任务链，一条命令即可拉取下一个任务、记录Git提交，并提供Trello风格的Web看板可视化。

### 核心价值
- 每次开启新对话，`seshflow next` 立即恢复工作上下文
- Git提交自动关联当前任务，形成完整的开发轨迹
- 跨平台（Windows/WSL/Linux）任务状态同步
- 可视化看板直观管理任务流

---

## 二、项目架构

### 整体结构
```
seshflow/
├── packages/
│   ├── cli/                      # CLI核心工具
│   │   ├── bin/
│   │   │   └── seshflow.js       # CLI入口
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.js       # 初始化
│   │   │   │   ├── add.js        # 添加任务
│   │   │   │   ├── next.js       # 拉取下一个
│   │   │   │   ├── done.js       # 完成任务
│   │   │   │   ├── move.js       # 移动任务列
│   │   │   │   ├── tree.js       # 查看依赖树
│   │   │   │   ├── log.js        # 查看提交记录
│   │   │   │   └── dashboard.js  # 启动看板
│   │   │   ├── core/
│   │   │   │   ├── task-manager.js
│   │   │   │   ├── git-hooks.js
│   │   │   │   └── storage.js
│   │   │   └── utils/
│   │   └── package.json
│   ├── web/                       # Trello风格看板
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.jsx
│   │   │   ├── App.jsx
│   │   │   ├── components/
│   │   │   │   ├── Board.jsx      # 主看板
│   │   │   │   ├── Column.jsx     # 状态列
│   │   │   │   ├── Card.jsx       # 任务卡片
│   │   │   │   ├── TaskDetail.jsx # 详情弹窗
│   │   │   │   ├── DependencyGraph.jsx
│   │   │   │   └── WSLDiscovery.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTasks.js
│   │   │   │   └── useWebSocket.js
│   │   │   └── styles/
│   │   ├── package.json
│   │   └── vite.config.js
│   └── shared/
│       ├── types/
│       │   └── task.d.ts
│       └── constants/
│           └── statuses.js
├── docs/                          # 文档
├── examples/                      # 示例项目
├── package.json                   # 根目录（pnpm workspace）
├── pnpm-workspace.yaml
└── README.md
```

---

## 三、数据模型

### 3.1 任务数据结构

```typescript
// shared/types/task.d.ts
export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Task {
  id: string;                       // 唯一ID (timestamp_random)
  title: string;                     // 任务标题
  description: string;               // 详细描述（支持Markdown）
  status: TaskStatus;
  priority: TaskPriority;
  
  // 依赖关系
  dependencies: string[];            // 依赖的任务ID
  blockedBy: string[];               // 被谁阻塞
  subtasks: Subtask[];               // 子任务
  
  // 时间跟踪
  createdAt: string;                 // ISO 8601
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedHours: number;
  actualHours: number;
  
  // 分类
  assignee: string | null;
  tags: string[];
  
  // Git集成
  gitBranch: string;
  gitCommits: GitCommit[];
  
  // 会话历史
  sessions: Session[];
  
  // 元数据
  context: {
    relatedFiles: string[];          // 相关文件
    commands: string[];              // 相关命令
    links: string[];                 // 相关链接
  };
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  taskId: string;
}

export interface Session {
  id: string;
  startedAt: string;
  endedAt: string | null;
  note: string;
}
```

### 3.2 存储文件格式

```json
// .seshflow/tasks.json
{
  "version": "1.0.0",
  "workspace": {
    "name": "my-project",
    "path": "/home/user/projects/my-project",
    "gitBranch": "feature/auth"
  },
  "metadata": {
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T15:30:00.000Z",
    "lastSession": "2024-01-01T15:30:00.000Z"
  },
  "columns": [
    { "id": "backlog", "name": "待办池", "color": "#94a3b8" },
    { "id": "todo", "name": "准备做", "color": "#3b82f6" },
    { "id": "in-progress", "name": "进行中", "color": "#eab308" },
    { "id": "review", "name": "审核", "color": "#8b5cf6" },
    { "id": "done", "name": "完成", "color": "#22c55e" },
    { "id": "blocked", "name": "阻塞", "color": "#ef4444" }
  ],
  "tasks": [
    {
      "id": "task_1704067200_a1b2",
      "title": "实现用户认证系统",
      "description": "使用JWT实现用户认证",
      "status": "in-progress",
      "priority": "P0",
      "dependencies": ["task_1704067100_c3d4"],
      "blockedBy": [],
      "subtasks": [
        {
          "id": "sub_1704067300",
          "title": "用户注册接口",
          "completed": true,
          "completedAt": "2024-01-01T11:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T14:30:00.000Z",
      "startedAt": "2024-01-01T10:30:00.000Z",
      "completedAt": null,
      "estimatedHours": 8,
      "actualHours": 3.5,
      "assignee": "alice",
      "tags": ["auth", "backend"],
      "gitBranch": "feature/auth",
      "gitCommits": [
        {
          "hash": "a1b2c3d",
          "message": "feat: add user registration",
          "author": "alice",
          "timestamp": "2024-01-01T11:05:00.000Z",
          "taskId": "task_1704067200_a1b2"
        }
      ],
      "sessions": [
        {
          "id": "sess_1704067300",
          "startedAt": "2024-01-01T10:30:00.000Z",
          "endedAt": "2024-01-01T12:00:00.000Z",
          "note": "完成注册接口"
        }
      ],
      "context": {
        "relatedFiles": ["src/auth/controller.ts", "src/auth/service.ts"],
        "commands": ["npm run test:auth"],
        "links": ["https://jwt.io/introduction"]
      }
    }
  ],
  "currentSession": {
    "taskId": "task_1704067200_a1b2",
    "startedAt": "2024-01-01T14:00:00.000Z"
  },
  "statistics": {
    "totalTasks": 24,
    "completedTasks": 8,
    "totalEstimatedHours": 156,
    "actualSpentHours": 67
  }
}
```

### 3.3 配置文件

```yaml
# .seshflow/config.yaml
workspace:
  name: "my-project"
  type: "wsl"  # windows | wsl | linux | mac
  path: "/home/user/projects/my-project"
  winPath: "C:\\Users\\user\\projects\\my-project"  # Windows路径（可选）

network:
  port: 5423  # WebSocket服务端口
  webPort: 5424  # Web看板端口
  discovery:
    enabled: true
    methods: ["broadcast", "mdns", "file"]
  peers:
    - "192.168.1.100:5423"  # 手动添加的实例

sync:
  autoSync: true
  interval: 3000  # 毫秒
  strategy: "last-write-wins"

git:
  autoHook: true  # 自动安装Git钩子
  commitTemplate: "feat({taskId}): {message}"  # 提交信息模板

ui:
  defaultView: "board"  # board | graph | timeline
  columns: ["backlog", "todo", "in-progress", "review", "done", "blocked"]
```

---

## 四、CLI命令详细设计

### 4.1 基础命令

```bash
# 初始化工作区
seshflow init [--force] [--template project-template]

# 添加任务（支持多行输入）
seshflow add "任务标题" \
  --desc "详细描述" \
  --priority P1 \
  --tags backend,auth \
  --depends task_id1,task_id2 \
  --estimate 4

# 从文件导入任务
seshflow import ./tasks.yaml
seshflow import ./tasks.csv

# 列出任务
seshflow list [--status todo] [--priority P0] [--tag auth] [--assignee alice]

# 查看任务详情
seshflow show <task-id>

# 编辑任务
seshflow edit <task-id> --title "新标题" --priority P0

# 删除任务
seshflow delete <task-id> [--force]

# 移动任务到指定列
seshflow move <task-id> in-progress

# 开始任务（记录开始时间）
seshflow start <task-id>

# 完成任务
seshflow done <task-id> [--hours 3.5] [--note "完成备注"]

# 阻塞任务
seshflow block <task-id> --reason "等待第三方API"

# 添加子任务
seshflow subtask <parent-id> "子任务标题"

# 查看任务依赖树
seshflow tree [--task <task-id>] [--depth 3]

# 查看Git提交记录
seshflow log [--task <task-id>] [--limit 10]

# 启动Web看板
seshflow dashboard [--port 5424] [--open]

# 连接其他实例
seshflow connect <windows|wsl|remote> [--address <ip>]

# 查看统计信息
seshflow stats [--since 2024-01-01] [--by assignee]
```

### 4.2 核心命令实现逻辑

#### `seshflow next` - 拉取下一个任务

```javascript
// packages/cli/src/commands/next.js
export async function nextTask(options) {
  const manager = new TaskManager();
  
  // 1. 获取当前会话任务
  const currentTask = manager.getCurrentTask();
  if (currentTask) {
    console.log('当前进行中的任务：');
    renderTask(currentTask);
    return;
  }
  
  // 2. 获取下一个可执行任务
  const nextTask = manager.getNextTask({
    priority: options.priority,
    tag: options.tag,
    assignee: options.assignee
  });
  
  if (!nextTask) {
    console.log('🎉 没有待处理的任务了！');
    return;
  }
  
  // 3. 检查依赖
  const unmetDeps = manager.getUnmetDependencies(nextTask);
  if (unmetDeps.length > 0) {
    console.log('⚠️ 任务依赖未完成：');
    unmetDeps.forEach(dep => console.log(`  - ${dep.title} (${dep.id})`));
    return;
  }
  
  // 4. 开始会话
  manager.startSession(nextTask.id);
  
  // 5. 自动切换Git分支
  if (nextTask.gitBranch) {
    execSync(`git checkout ${nextTask.gitBranch}`, { stdio: 'inherit' });
  }
  
  // 6. 显示任务详情
  renderTask(nextTask, { detailed: true });
  
  // 7. 输出给AI的上下文
  console.log('\n📋 AI对话上下文：');
  console.log(`当前任务：${nextTask.title}`);
  console.log(`描述：${nextTask.description}`);
  console.log(`相关文件：${nextTask.context.relatedFiles.join(', ')}`);
  console.log(`上次会话：${nextTask.sessions[0]?.note || '无'}`);
}
```

#### `seshflow add` - 添加任务

```javascript
// packages/cli/src/commands/add.js
export async function addTask(title, options) {
  const manager = new TaskManager();
  
  // 交互式输入描述（如果没提供）
  if (!options.desc && process.stdin.isTTY) {
    const response = await inquirer.prompt([
      {
        type: 'editor',
        name: 'description',
        message: '输入任务详细描述：',
        default: options.desc
      }
    ]);
    options.desc = response.description;
  }
  
  const task = manager.createTask({
    title,
    description: options.desc,
    priority: options.priority || 'P2',
    tags: options.tags?.split(',').map(t => t.trim()) || [],
    dependencies: options.depends?.split(',').map(d => d.trim()) || [],
    estimatedHours: options.estimate || null,
    assignee: options.assignee || null,
    gitBranch: options.branch || `feature/${title.toLowerCase().replace(/\s+/g, '-')}`
  });
  
  // 验证依赖是否存在
  const invalidDeps = manager.validateDependencies(task.dependencies);
  if (invalidDeps.length > 0) {
    console.warn('⚠️ 以下依赖任务不存在：', invalidDeps.join(', '));
  }
  
  // 创建Git分支
  if (options.createBranch) {
    execSync(`git checkout -b ${task.gitBranch}`);
  }
  
  console.log('✅ 任务创建成功：', task.id);
  return task;
}
```

---

## 五、Trello风格Web看板

### 5.1 主看板组件

```jsx
// packages/web/src/components/Board.jsx
import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import Column from './Column';
import TaskDetail from './TaskDetail';
import DependencyGraph from './DependencyGraph';
import { useTasks } from '../hooks/useTasks';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Board() {
  const { tasks, columns, updateTask, loading } = useTasks();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const { connected, instances } = useWebSocket();
  
  // 按状态分组任务
  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    updateTask(draggableId, { status: newStatus });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Seshflow</h1>
          <span className="text-sm text-gray-500">
            {instances.length} 个在线实例
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 同步状态 */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {connected ? '已同步' : '未连接'}
            </span>
          </div>
          
          {/* 视图切换 */}
          <button
            onClick={() => setShowGraph(!showGraph)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {showGraph ? '显示看板' : '显示依赖图'}
          </button>
          
          {/* 实例选择器 */}
          <select className="text-sm border rounded px-2 py-1">
            {instances.map(inst => (
              <option key={inst.id}>{inst.name} ({inst.type})</option>
            ))}
          </select>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex-1 overflow-hidden">
        {showGraph ? (
          <DependencyGraph tasks={tasks} onTaskClick={setSelectedTask} />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full flex gap-4 p-4 overflow-x-auto">
              {columns.map(column => (
                <Column
                  key={column.id}
                  column={column}
                  tasks={tasksByStatus[column.id] || []}
                  onTaskClick={setSelectedTask}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
        />
      )}
    </div>
  );
}
```

### 5.2 看板列组件

```jsx
// packages/web/src/components/Column.jsx
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const columnColors = {
  backlog: 'bg-gray-100',
  todo: 'bg-blue-50',
  'in-progress': 'bg-yellow-50',
  review: 'bg-purple-50',
  done: 'bg-green-50',
  blocked: 'bg-red-50'
};

const Column = ({ column, tasks, onTaskClick }) => {
  return (
    <div className={`flex-shrink-0 w-80 rounded-lg ${columnColors[column.id] || 'bg-gray-50'}`}>
      {/* 列头 */}
      <div className="p-3 border-b border-white/50">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-700">{column.name}</h3>
          <span className="text-sm text-gray-500 bg-white/50 px-2 py-1 rounded">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* 任务列表 */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-100/50' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <Card
                key={task.id}
                task={task}
                index={index}
                onClick={() => onTaskClick(task)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default Column;
```

### 5.3 任务卡片组件

```jsx
// packages/web/src/components/Card.jsx
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const priorityColors = {
  P0: 'bg-red-500',
  P1: 'bg-orange-500',
  P2: 'bg-yellow-500',
  P3: 'bg-blue-500'
};

const Card = ({ task, index, onClick }) => {
  const completionRate = task.subtasks.length > 0
    ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100
    : 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded-lg shadow-sm p-3 mb-2 border-l-4 cursor-pointer hover:shadow-md transition ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          }`}
          style={{
            borderLeftColor: priorityColors[task.priority] || '#94a3b8',
            ...provided.draggableProps.style
          }}
        >
          {/* 标题 */}
          <h4 className="font-medium text-gray-800 mb-2">{task.title}</h4>
          
          {/* 标签 */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* 元信息 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {/* 优先级标记 */}
              <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
              
              {/* 任务ID */}
              <span>{task.id.slice(-4)}</span>
              
              {/* 依赖数 */}
              {task.dependencies.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5L14 3m0 0l7 8.5M14 3v18" />
                  </svg>
                  {task.dependencies.length}
                </span>
              )}
            </div>
            
            {/* 子任务进度 */}
            {task.subtasks.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span>{Math.round(completionRate)}%</span>
              </div>
            )}
          </div>
          
          {/* 分配者 */}
          {task.assignee && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {task.assignee}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default Card;
```

### 5.4 任务详情弹窗

```jsx
// packages/web/src/components/TaskDetail.jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const TaskDetail = ({ task, onClose, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(task);

  const handleSave = () => {
    onUpdate(task.id, formData);
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[800px] max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">
              {editing ? '编辑任务' : task.title}
            </h2>
            <span className={`px-2 py-1 text-xs rounded ${
              task.priority === 'P0' ? 'bg-red-100 text-red-700' :
              task.priority === 'P1' ? 'bg-orange-100 text-orange-700' :
              task.priority === 'P2' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {task.priority}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {editing ? '取消' : '编辑'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              关闭
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {editing ? (
            // 编辑模式
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={6}
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="backlog">待办池</option>
                    <option value="todo">准备做</option>
                    <option value="in-progress">进行中</option>
                    <option value="review">审核</option>
                    <option value="done">完成</option>
                    <option value="blocked">阻塞</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    优先级
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="P0">P0 - 最高</option>
                    <option value="P1">P1 - 高</option>
                    <option value="P2">P2 - 中</option>
                    <option value="P3">P3 - 低</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            // 查看模式
            <div className="space-y-6">
              {/* 描述 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">描述</h3>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                </div>
              </div>

              {/* 子任务 */}
              {task.subtasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">子任务</h3>
                  <ul className="space-y-1">
                    {task.subtasks.map(sub => (
                      <li key={sub.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <span className={sub.completed ? 'line-through text-gray-400' : ''}>
                          {sub.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Git提交记录 */}
              {task.gitCommits.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Git提交</h3>
                  <div className="bg-gray-50 rounded p-3 font-mono text-sm space-y-1">
                    {task.gitCommits.map(commit => (
                      <div key={commit.hash} className="flex items-start gap-2">
                        <span className="text-gray-500">{commit.hash.slice(0,7)}</span>
                        <span className="text-gray-700">{commit.message}</span>
                        <span className="text-gray-400 text-xs ml-auto">{commit.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 会话历史 */}
              {task.sessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">会话记录</h3>
                  <div className="space-y-2">
                    {task.sessions.map(session => (
                      <div key={session.id} className="bg-blue-50 rounded p-3 text-sm">
                        <div className="flex justify-between text-gray-500 mb-1">
                          <span>{session.startedAt}</span>
                          {session.endedAt && <span>→ {session.endedAt}</span>}
                        </div>
                        <p className="text-gray-700">{session.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 相关文件 */}
              {task.context.relatedFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">相关文件</h3>
                  <div className="flex flex-wrap gap-2">
                    {task.context.relatedFiles.map(file => (
                      <span key={file} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
```

### 5.5 依赖关系图

```jsx
// packages/web/src/components/DependencyGraph.jsx
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const DependencyGraph = ({ tasks, onTaskClick }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!tasks.length) return;

    // 构建图数据
    const nodes = tasks.map(t => ({
      id: t.id,
      name: t.title,
      status: t.status,
      priority: t.priority
    }));

    const links = [];
    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        links.push({
          source: task.id,
          target: depId,
          type: 'depends'
        });
      });
    });

    // 初始化D3力导向图
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.parentElement.clientWidth;
    const height = 600;

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // 绘制连线
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // 绘制节点
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', (event, d) => onTaskClick(tasks.find(t => t.id === d.id)));

    // 节点圆圈
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => {
        switch(d.status) {
          case 'done': return '#22c55e';
          case 'in-progress': return '#eab308';
          case 'blocked': return '#ef4444';
          default: return '#94a3b8';
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // 节点标签
    node.append('text')
      .text(d => d.name.substring(0, 15) + (d.name.length > 15 ? '...' : ''))
      .attr('x', 25)
      .attr('y', 5)
      .attr('font-size', 12);

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 拖拽函数
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [tasks]);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow">
      <svg ref={svgRef} width="100%" height="600" />
    </div>
  );
};

export default DependencyGraph;
```

---

## 六、跨平台发现与同步

### 6.1 WebSocket服务（CLI内置）

```javascript
// packages/cli/src/core/sync-server.js
import WebSocket, { WebSocketServer } from 'ws';
import dgram from 'dgram';
import os from 'os';
import { TaskManager } from './task-manager.js';

export class SyncServer {
  constructor(workspacePath, port = 5423) {
    this.workspacePath = workspacePath;
    this.port = port;
    this.manager = new TaskManager(workspacePath);
    this.clients = new Map();
    
    this.initWebSocket();
    this.initBroadcastDiscovery();
  }

  initWebSocket() {
    this.wss = new WebSocketServer({ port: this.port });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
      this.clients.set(clientId, ws);
      
      // 发送初始数据
      ws.send(JSON.stringify({
        type: 'init',
        data: this.manager.getData()
      }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMessage(clientId, message);
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }

  initBroadcastDiscovery() {
    // UDP广播用于发现
    const udp = dgram.createSocket('udp4');
    
    udp.on('message', (msg, rinfo) => {
      const message = msg.toString();
      if (message.startsWith('SESHFLOW_DISCOVERY')) {
        // 响应发现请求
        const response = Buffer.from(`SESHFLOW_RESPONSE:${this.getLocalIP()}:${this.port}`);
        udp.send(response, rinfo.port, rinfo.address);
      }
    });
    
    udp.bind(5425, () => {
      udp.setBroadcast(true);
    });
    
    // 定期广播自己的存在
    setInterval(() => {
      const broadcastMsg = Buffer.from(`SESHFLOW_ANNOUNCE:${this.getLocalIP()}:${this.port}`);
      udp.send(broadcastMsg, 5425, '255.255.255.255');
    }, 30000);
  }

  handleMessage(clientId, message) {
    switch(message.type) {
      case 'sync':
        // 同步任务更新
        this.manager.mergeData(message.data);
        this.broadcast(message, [clientId]); // 广播给其他客户端
        break;
        
      case 'pull':
        // 拉取最新数据
        const ws = this.clients.get(clientId);
        ws.send(JSON.stringify({
          type: 'sync',
          data: this.manager.getData()
        }));
        break;
    }
  }

  broadcast(message, exclude = []) {
    this.clients.forEach((ws, clientId) => {
      if (!exclude.includes(clientId)) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}
```

### 6.2 WSL自动发现脚本

```bash
# packages/cli/scripts/discover-wsl.sh
#!/bin/bash

# 发现WSL实例
echo "🔍 正在扫描WSL实例..."

# 方法1: 通过wsl命令
if command -v wsl.exe &> /dev/null; then
  echo "📌 通过wsl.exe发现:"
  wsl.exe -l -v | while read line; do
    if [[ $line == *"Running"* ]]; then
      distro=$(echo $line | awk '{print $1}')
      echo "  - $distro (运行中)"
      
      # 获取该WSL实例的IP
      wsl.exe -d $distro -- ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | while read ip; do
        echo "    IP: $ip"
        
        # 测试连接
        if curl -s "http://$ip:5423" &>/dev/null; then
          echo "    ✅ seshflow服务已运行"
        fi
      done
    fi
  done
fi

# 方法2: 扫描WSL虚拟网卡
echo ""
echo "📌 扫描WSL虚拟网络..."
for ip in 172.{16..31}.{0..255}.{1..254}; do
  # 快速ping扫描
  ping -c 1 -W 1 $ip &>/dev/null && echo "  ✅ $ip 可达" &
done
wait

# 方法3: UDP广播发现
echo ""
echo "📌 UDP广播发现..."
echo "SESHFLOW_DISCOVERY" | nc -u -b -w 2 255.255.255.255 5425
```

### 6.3 Windows发现WSL的PowerShell脚本

```powershell
# packages/cli/scripts/discover-wsl.ps1
Write-Host "🔍 正在扫描WSL实例..." -ForegroundColor Cyan

# 获取WSL列表
$wslList = wsl -l -v | Select-String -Pattern "Running"

foreach ($line in $wslList) {
    $parts = $line -split '\s+'
    $distro = $parts[0]
    
    Write-Host "📌 $distro (运行中)" -ForegroundColor Yellow
    
    # 获取WSL的IP
    $ip = wsl -d $distro -- ip addr show eth0 | Select-String -Pattern "inet\s+(\d+\.\d+\.\d+\.\d+)" | 
          ForEach-Object { $_.Matches.Groups[1].Value }
    
    Write-Host "    IP: $ip"
    
    # 测试seshflow服务
    try {
        $response = Invoke-WebRequest -Uri "http://${ip}:5423" -Method Head -TimeoutSec 1
        Write-Host "    ✅ seshflow服务已运行" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠️ seshflow服务未运行" -ForegroundColor Gray
    }
}

# 自动添加到配置文件
$configPath = ".seshflow\config.yaml"
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw
    # 解析并添加peers
    # ...
}
```

### 6.4 React Hook - 使用WebSocket

```jsx
// packages/web/src/hooks/useWebSocket.js
import { useState, useEffect, useCallback } from 'react';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [instances, setInstances] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [ws, setWs] = useState(null);

  const connect = useCallback((url) => {
    const websocket = new WebSocket(url);
    
    websocket.onopen = () => {
      setConnected(true);
      // 拉取初始数据
      websocket.send(JSON.stringify({ type: 'pull' }));
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'init':
        case 'sync':
          setTasks(data.data.tasks);
          break;
          
        case 'instance':
          setInstances(prev => [...prev, data.instance]);
          break;
      }
    };
    
    websocket.onclose = () => {
      setConnected(false);
      setTimeout(() => {
        // 尝试重连
        connect(url);
      }, 3000);
    };
    
    setWs(websocket);
    
    return () => websocket.close();
  }, []);

  // UDP广播发现实例
  useEffect(() => {
    // 创建UDP socket（通过WebSocket服务器中转）
    const discover = setInterval(() => {
      fetch('/api/discover')
        .then(res => res.json())
        .then(data => setInstances(data.instances));
    }, 5000);
    
    return () => clearInterval(discover);
  }, []);

  const syncTask = useCallback((taskId, updates) => {
    if (ws && connected) {
      ws.send(JSON.stringify({
        type: 'sync',
        data: { taskId, updates }
      }));
    }
  }, [ws, connected]);

  return {
    connected,
    instances,
    tasks,
    connect,
    syncTask
  };
}
```

---

## 七、PNPM Workspace配置

### 7.1 根目录 package.json

```json
{
  "name": "seshflow-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:cli": "pnpm --filter cli dev",
    "dev:web": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "publish": "pnpm -r publish",
    "docs": "cd docs && mintlify dev"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### 7.2 pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'docs'
  - 'examples/*'
```

### 7.3 CLI包 package.json

```json
{
  "name": "@seshflow/cli",
  "version": "1.0.0",
  "description": "Seshflow CLI - 跨对话任务序列器",
  "type": "module",
  "bin": {
    "seshflow": "./bin/seshflow.js"
  },
  "files": [
    "bin",
    "dist"
  ],
  "scripts": {
    "dev": "node bin/seshflow.js",
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "pnpm build && pnpm test"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.0",
    "conf": "^12.0.0",
    "ws": "^8.14.0",
    "uuid": "^9.0.0",
    "simple-git": "^3.19.0",
    "yaml": "^2.3.0",
    "table": "^6.8.0",
    "ora": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/ws": "^8.5.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "keywords": [
    "task-manager",
    "git-integration",
    "ai-assistant",
    "session-manager",
    "workflow",
    "cli"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/seshflow"
  }
}
```

### 7.4 Web包 package.json

```json
{
  "name": "@seshflow/web",
  "version": "1.0.0",
  "description": "Seshflow Web看板",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-beautiful-dnd": "^13.1.1",
    "react-markdown": "^9.0.0",
    "d3": "^7.8.0",
    "socket.io-client": "^4.7.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/d3": "^7.4.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vitest": "^0.34.0"
  }
}
```

---

## 八、完整使用流程示例

### 8.1 初始化项目

```bash
# 创建新项目
mkdir my-awesome-app
cd my-awesome-app
git init

# 安装seshflow
pnpm add -g seshflow

# 初始化
seshflow init --name "我的AI应用"

# 查看生成的配置
ls -la .seshflow/
# .seshflow/tasks.json
# .seshflow/config.yaml
```

### 8.2 规划任务

```bash
# 添加任务1：数据库设计
seshflow add "设计数据库Schema" \
  --desc "
设计用户、文章、评论表结构
- 用户表：id, email, password_hash, created_at
- 文章表：id, user_id, title, content, created_at
- 评论表：id, article_id, user_id, content, created_at
" \
  --priority P0 \
  --tags database,design \
  --estimate 4

# 输出: ✅ 任务创建成功：task_1704067200_a1b2

# 添加任务2：API开发（依赖任务1）
seshflow add "实现RESTful API" \
  --desc "开发用户、文章、评论的CRUD接口" \
  --priority P0 \
  --tags backend,api \
  --depends task_1704067200_a1b2 \
  --estimate 8

# 添加任务3：前端页面
seshflow add "开发登录页面" \
  --desc "实现用户登录/注册的前端界面" \
  --priority P1 \
  --tags frontend,react \
  --estimate 6

# 查看任务树
seshflow tree

# 输出：
# 📊 任务依赖树
# 
# task_1704067200_a1b2 [设计数据库Schema] (P0)
# └── task_1704067300_c3d4 [实现RESTful API] (P0)
#     └── task_1704067400_e5f6 [开发登录页面] (P1)
```

### 8.3 开始第一个对话

```bash
# 拉取第一个任务
seshflow next

# 输出：
# ┌─────────────────────────────────────────────┐
# │ 当前任务：设计数据库Schema                    │
# ├─────────────────────────────────────────────┤
# │ ID: task_1704067200_a1b2                     │
# │ 优先级: P0                                    │
# │ 预估工时: 4h                                  │
# │ 标签: database, design                        │
# ├─────────────────────────────────────────────┤
# │ 描述:                                        │
# │ 设计用户、文章、评论表结构                    │
# │ - 用户表：id, email, password_hash...        │
# └─────────────────────────────────────────────┘
# 
# 📋 AI对话上下文：
# 当前任务：设计数据库Schema
# 描述：设计用户、文章、评论表结构
# 相关文件：暂无
# 上次会话：无
# 
# 💡 建议：先创建数据库设计文档，考虑使用Prisma或TypeORM

# 开始工作，Git提交自动记录
git add .
git commit -m "feat: 添加用户表设计"

# seshflow自动记录：
# ✅ Git提交关联到当前任务 (task_1704067200_a1b2)
```

### 8.4 完成任务，继续下一个

```bash
# 完成任务
seshflow done --hours 3 --note "完成了数据库设计，包括所有表结构"

# 拉取下一个任务
seshflow next

# 输出：
# ┌─────────────────────────────────────────────┐
# │ 当前任务：实现RESTful API                     │
# ├─────────────────────────────────────────────┤
# │ 依赖状态：                                    │
# │ ✅ 设计数据库Schema (已完成)                  │
# └─────────────────────────────────────────────┘
```

### 8.5 开启Web看板

```bash
# 启动看板
seshflow dashboard --open

# 浏览器自动打开 http://localhost:5424
# 看到Trello风格的任务看板，可以拖拽卡片改变状态
```

### 8.6 跨平台同步

```bash
# 在Windows中
cd C:\Projects\my-awesome-app
seshflow init --wsl-path \\wsl$\Ubuntu\home\user\my-awesome-app

# 自动发现WSL实例
seshflow connect wsl

# 在WSL中
cd ~/my-awesome-app
seshflow connect windows

# 现在两边任务自动同步
```

---

## 九、快速开始模板（给Claude）

```
我需要实现seshflow项目，请按以下步骤生成代码：

1. 创建项目结构（pnpm workspace）
2. 实现CLI核心命令：init, add, next, done, move, tree
3. 实现Git钩子自动记录提交
4. 实现Trello风格Web看板（React + DnD）
5. 实现WebSocket同步服务
6. 实现WSL/Windows自动发现

关键文件清单：
- packages/cli/src/core/task-manager.js - 任务管理核心
- packages/cli/src/commands/next.js - 拉取任务逻辑  
- packages/web/src/components/Board.jsx - 主看板
- packages/cli/src/core/sync-server.js - 同步服务
- scripts/discover-wsl.sh - WSL发现脚本

数据结构使用上面定义的Task接口，确保依赖关系正确处理。
```

---

## 十、项目里程碑

### Phase 1: MVP (2周)
- [x] 基础CLI命令（init, add, next, done）
- [x] JSON文件存储
- [x] Git钩子集成

### Phase 2: 可视化 (1周)  
- [x] React看板基础版
- [x] 拖拽改变状态
- [x] 任务详情弹窗

### Phase 3: 同步 (1周)
- [x] WebSocket服务
- [x] 跨实例同步
- [x] 冲突处理

### Phase 4: 发现机制 (1周)
- [x] WSL自动发现
- [x] UDP广播
- [x] 配置文件管理

### Phase 5: 完善 (1周)
- [x] 依赖关系图
- [x] 统计报表
- [x] 完整文档
- [x] 发布到npm

---
