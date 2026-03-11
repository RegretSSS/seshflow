# Seshflow v1.4.2

`v1.4.2` 是一个面向 npm 安装用户的聚焦 hotfix。

## 重点

- 修复了 `@seshflow/cli` 对 `@seshflow/shared` 的已发布运行时依赖声明。
- 恢复了通过 npm 直接安装 CLI 时的 contract、`rpc shell`、handoff 等共享能力命令。

## 为什么有这个版本

`@seshflow/cli@1.4.1` 在运行时引用了 shared 模块，但发布依赖里没有声明 `@seshflow/shared`。在 monorepo 本地开发环境里，这个问题会被 workspace 链接掩盖；但 npm 安装用户会在运行时遇到类似错误：

```text
Cannot find module '@seshflow/shared/constants/integration.js'
```

`v1.4.2` 修复的是这个打包/发布问题，不改变 CLI 的工作流语义。

## 范围

这个 hotfix **不**新增工作流功能，只恢复已发布 CLI 包应有的运行时可用性。
