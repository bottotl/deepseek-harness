# Agent Note: Workspace UI 扩展槽位

Status: implemented

[English](2026-10-08-workspace-ui-extension-slots.md) | 中文

## 问题

目录流贡献可以选取目录，但不能表达独立拥有的创建流程，也不能为已有 Workspace 展示扩展数据。在目录流里编码工程行为会让基础 UI 负责另一插件的操作状态。

## 决策

[Workspace UI 插件](../../../../packages/client/ui-workspace/README.zh.md#workspace-extensions)在既有 Slot Registry 中拥有可叠加的创建、Workspace 菜单和展开详情列表。贡献者保留表单、错误、权限与持久存储。Owner props 传递已登记的 Workspace 身份、显示数据和窄导航、关闭回调，不包含扩展元数据，也不授予 Host 写权限。

目录接纳是普通创建贡献。没有其他条目时，头部保留直接选目录；有其他条目时展示共享菜单。这保留了单操作组合的易用性，同时支持不依赖目录选择器的创建插件。插件自有表单放在临时菜单之外，通常通过 `shell.overlay` 展示。

## 验证

纯浏览器和行组件测试保留目录接纳、重命名、删除与 Session 导航。真实 Loader/Web 场景加载两个独立外部包，观察三类贡献，调用创建和 Workspace 操作，分别移除包，再次启用一个包时不重复注册。隔离 scaffold 拥有登记存储、目录、服务与浏览器。发布声明、客户端 bundle 与生成的 Client Slot 目录包含新增槽位。

## 考虑过的替代方案

另建贡献注册系统会重复 Cordis effect 与 slot 生命周期。替换单个目录流无法同时提供多个流程。在基础 UI 中查询工程会让通用 Workspace 渲染依赖可选扩展的身份与存储。

## 后果

基础插件在没有扩展时仍可用。菜单贡献随关闭卸载；持久操作状态与浮层归贡献者拥有。详情贡献仅在真实 Workspace 分组展开时挂载，不为 Ungrouped、搜索或平铺视图挂载。这些槽位提供 UI 组合，不提供持久绑定、事务创建或删除恢复。
