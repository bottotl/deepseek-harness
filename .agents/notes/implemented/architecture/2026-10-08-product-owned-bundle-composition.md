# Agent Note: Product-owned bundle composition

Status: implemented

English | [中文](2026-10-08-product-owned-bundle-composition.zh.md)

## Problem

An application that reuses the official Web UI needs the official bundle layers without copying their roster. Its signed profile may also have a transaction owner that cannot accept direct package or YAML writes from the native Plugins page.

## Decision

`dsh.bundle.extends` composes installed parents before the selecting bundle. Repeated layers apply once, cycles fail, and an unreadable parent rejects the whole selection. Independent selections remain available. The parent declaration never installs packages.

Plugin manager's `managedOperations` mode delegates inspection, installation receipts and mutations to the application's `pluginManagementOperations` service. It fails when that service is absent and exposes individual Loader rows as read-only. Optional `canManageBundle` and `additionalBundles` expose product-owned lifecycle availability and installed runtimes outside YAML bundles. Native profiles retain the default implementation. Inspection can declare `activateOnInstall` when installation and activation belong to one product transaction.

## Alternatives considered

**Copy the official roster into a product patch.** Copies drift when the official Web product adds or changes plugins; ordered inheritance keeps the owning bundles authoritative.

**Let the native manager write a signed profile.** This bypasses the application's activation owner. Delegation preserves the native Remote methods while leaving trust checks and durable restart receipts to the application.

## Consequences

Products reuse the native UI but must provide a complete mutation service in managed mode. Bundle parents must already exist in the installed dependency closure. Version checks and failed selections remain visible through the existing profile diagnostics. Loader composition and managed-operation tests cover ordering, cycle rejection, absence of partial layers, delegation and refusal of fallback writes.
