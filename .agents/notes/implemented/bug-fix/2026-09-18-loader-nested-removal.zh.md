# Agent Note: 按所属组的局部 id 删除嵌套 Loader entry

Status: implemented

[English](2026-09-18-loader-nested-removal.md) | 中文

## Problem

Include 树内的 Loader entry 对外暴露带树前缀的 id，但父组以局部 id 保存该 entry。把完整 id 传给父组会让删除操作直接返回，既不释放也不删除 entry，依赖它的注册内容因此仍然有效。

## Decision

`EntryTree.remove()` 先解析调用方的完整 id，再把已解析 entry 的 `options.id` 传给父组。公开 id 语法和文件回写所有者保持不变。此 vendor 差异记录在 [vendor 清单](../../../../vendor/README.md)。

## Alternatives considered

**由调用方遍历树。** 要求各插件自行寻找所属树并使用局部 id，会重复 Loader 的所有权逻辑，也会让公开 remove API 继续不可靠。修正应由该 API 承担。

## Consequences

通过根 Loader 删除 Include 中的 entry，会释放其效果并将其移出树；其他树内具有相同局部 id 的兄弟 entry 保持挂载。[config-reload.spec.ts](../../../../packages/boot/app-boot/tests/config-reload.spec.ts) 中的回归测试通过真实启动的 Include 组合检查树内删除、释放输出和兄弟 entry 身份。本改动不新增 Session 事件或持久化数据格式。
