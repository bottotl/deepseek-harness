# Agent Note: Remove nested Loader entries by their owning group id

Status: implemented

English | [中文](2026-09-18-loader-nested-removal.zh.md)

## Problem

A Loader entry inside an Include tree exposes a qualified id. The parent group stores the same entry under its local id. Passing the qualified id into the group makes removal return without disposing or deleting the entry, so dependent registry contributions remain active.

## Decision

`EntryTree.remove()` resolves the caller's qualified id once and passes the resolved entry's `options.id` to its parent group. The public id syntax and file write-back owner stay unchanged. The vendored divergence is recorded in [the vendor manifest](../../../../vendor/README.md).

## Alternatives considered

**Caller-side tree traversal.** Making each plugin find the containing tree and use its local id would duplicate Loader ownership logic and leave the public remove API unreliable. The correction belongs in that API.

## Consequences

Included entries release their effects and leave the tree when removed through the root Loader. Same-id siblings in other trees remain mounted. The regression in [config-reload.spec.ts](../../../../packages/boot/app-boot/tests/config-reload.spec.ts) checks graph removal, disposal output, and sibling identity through a booted Include composition. This change adds no Session events or persisted data format.
