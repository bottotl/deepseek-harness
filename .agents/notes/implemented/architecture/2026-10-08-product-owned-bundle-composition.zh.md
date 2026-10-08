# Agent Note: 产品持有的组合包装配

Status: implemented

[English](2026-10-08-product-owned-bundle-composition.md) | 中文

## 问题

复用官方 Web UI 的应用需要直接消费官方组合包层，而不复制插件清单。签名 profile 还可能有独立事务持有者，不能接受原生插件页直接写包清单或 YAML。

## 决策

`dsh.bundle.extends` 先组合已安装父包，再组合当前选择的包。重复层只应用一次，循环会失败；任一父层无法读取都会拒绝整个选择。独立选择仍可用。父包声明本身不安装包。

插件管理器的 `managedOperations` 模式将来源检查、安装回执和修改委托给应用的 `pluginManagementOperations` 服务。服务缺失时失败，并将单独的 Loader 行设为只读。可选的 `canManageBundle` 和 `additionalBundles` 展示产品持有的生命周期可用性及 YAML 组合包之外的已安装运行时。原生 profile 保留默认实现。若安装和激活属于同一产品事务，检查结果可声明 `activateOnInstall`。

## 考虑过的替代方案

**将官方插件清单复制到产品 patch。** 官方 Web 产品新增或修改插件时，副本会漂移；有序继承让原组合包继续持有定义。

**允许原生管理器写签名 profile。** 这会绕过应用的激活持有者。委托保留原生 Remote 方法，由应用负责信任检查和跨重启的持久回执。

## 影响

产品可复用原生 UI，但在受管模式下必须提供完整修改服务。父组合包必须已存在于安装依赖闭包中。版本检查与失败选择仍通过既有 profile 诊断展示。Loader 装配与受管操作测试覆盖顺序、循环拒绝、不保留部分层、委托及禁止回退写入。
