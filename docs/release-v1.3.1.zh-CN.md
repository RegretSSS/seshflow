# Seshflow v1.3.1 发版说明

`v1.3.1` 是一个以 AI 使用体验、安全探测和契约模型一致性为主的补丁版本。

## 核心更新

- `seshflow ncfr` 等 pre-init 探测命令现在完全无副作用
- 默认 help 聚焦正常使用路径，集成/开发者能力统一放到 `seshflow --help --advanced`
- 高频命令默认输出进一步收紧，只返回更小的非空摘要
- contract 批量导入对 JSON object、JSON array、JSONL 的说明更清楚
- contract 的 `kind` 和 `protocol` 现在都视为描述性字段，像 `event-stream` 这样的值会被一致接受

## 包版本

- `@seshflow/cli@1.3.1`
- `@seshflow/shared@1.3.1`
- `@seshflow/web@1.3.1`

## 相比 v1.3.0 的变化

- 修复了 `ncfr` 等 pre-init 探测会创建半套 workspace 状态的问题
- 增加高级帮助分层，避免默认 help 暴露集成向命令
- 进一步压缩 `ncfr`、`next`、`start`、`done`、`show` 的默认 JSON 输出
- 给高频流程补了轻量的 unbound-contract 和 inspection hint
- 补清了 batch contract import 的文档和 init 输出
- 放宽 contract `kind/protocol` 校验，使更广义的描述性契约模型可以直接记录

## 备注

- `v1.4.0` 仍处于规划阶段，尚未开始。
- 这个版本不改变 `v1.3.0` 的 contract-first 边界，只是把已发布体验进一步硬化。
