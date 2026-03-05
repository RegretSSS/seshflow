# @seshflow/web

Seshflow Web Dashboard - Trello 风格的任务看板界面

## 功能特性

- ✅ Trello 风格看板布局
- ✅ 拖放任务管理（react-beautiful-dnd）
- ✅ 列组件（Column）- 显示列头、任务计数、拖放区域
- ✅ 卡片组件（Card）- 显示任务详情、优先级、标签
- ✅ 主看板组件（Board）- 完整的看板布局
- ✅ 响应式设计
- ✅ 自定义样式

## 安装

```bash
pnpm install
```

## 开发

```bash
pnpm dev
```

访问 http://localhost:3000

## 构建

```bash
pnpm build
```

## 组件结构

```
src/
├── components/
│   ├── Board.jsx      # 主看板组件
│   ├── Column.jsx     # 列组件 ✨
│   └── Card.jsx       # 卡片组件 ✨
├── styles/
│   ├── Board.css      # 看板样式
│   ├── Column.css     # 列样式 ✨
│   ├── Card.css       # 卡片样式 ✨
│   └── App.css        # 全局样式
├── App.jsx            # 根组件
└── main.jsx           # 入口文件
```

## 组件说明

### Column 组件

列组件，实现单列显示：

- 列头（名称 + 任务数）
- 任务列表容器
- 拖放区域（react-beautiful-dnd）

```jsx
<Column
  column={columnData}
  tasks={tasksArray}
  onCardClick={handleCardClick}
/>
```

### Card 组件

任务卡片组件：

- 优先级指示器
- 任务标题
- 标签显示
- 工时信息
- 分配人信息

```jsx
<Card
  task={taskData}
  index={0}
  onClick={handleClick}
/>
```

### Board 组件

主看板组件：

- 头部信息栏
- 列容器
- 拖放上下文

```jsx
<Board />
```

## 技术栈

- React 18
- Vite
- react-beautiful-dnd
- D3.js（用于依赖关系图）

## 开发状态

✅ Phase 2.3: Column 列组件 - 已完成
- ✅ 列头显示（名称 + 任务数）
- ✅ 任务列表容器
- ✅ 拖放区域集成
- ✅ 样式优化
- ✅ 响应式设计

## 下一步

- [ ] 集成后端 API
- [ ] 实现 WebSocket 实时同步
- [ ] 添加任务详情弹窗
- [ ] 实现依赖关系图

## License

MIT
