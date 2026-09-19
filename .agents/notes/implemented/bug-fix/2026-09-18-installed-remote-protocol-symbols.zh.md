# Agent Note: 识别已安装的 Remote 协议导出

Status: implemented

[English](2026-09-18-installed-remote-protocol-symbols.md) | 中文

## Problem

外部包可以针对已发布的 Typert 协议通过编译，但 Remote 生成仍返回空产物。已安装声明文件既没有工作区注册，也不使用仓库内夹具的 ambient 模块声明，因此此前两条识别路径都无法识别其标记。

## Decision

分析器通过现有 TypeScript 模块解析缓存，从消费方源文件解析规范的协议模块，并比较候选符号与对应公开导出各自解析后的符号身份。工作区和 ambient 声明的识别方式继续保留。Remote 装饰器、Service 绑定以及 lookup 或 Context 协议类型共用此识别逻辑。

## Alternatives considered

**只匹配符号名称。** 其他依赖也可能导出名为 Remote 的装饰器，该名称不能赋予它 Typert 语义。符号相等检查保留了所有者身份。

**把协议加入工作区项目。** 已发布依赖的消费方只拥有声明与包导出，要求使用协议源码或 ambient 替代声明，会掩盖安装包场景的失败，而不是支持这一消费方式。

## Consequences

独立包构建可以直接使用已发布依赖。现有工作区生成仍遵循原有源码归属规则，依赖中的类型不会变为工作区自有类型。[Remote 模型测试](../../../../packages/typert/generator/tests/remote-model.spec.ts) 覆盖已安装声明以及其他包的同名装饰器。本改动不改变运行时派发或 wire 格式。
