# Agent Note: Workspace UI extension slots

Status: implemented

English | [中文](2026-10-08-workspace-ui-extension-slots.zh.md)

## Problem

A directory-flow contribution can pick a directory, but it cannot expose an independently owned creation workflow or render extension data for an existing Workspace. Encoding project-specific behavior in that flow would make the base UI own another plugin's operation state.

## Decision

The [Workspace UI plugin](../../../../packages/client/ui-workspace/README.md#workspace-extensions) owns additive creation, Workspace-menu and expanded-detail lists in the existing Slot Registry. Contributors retain their forms, errors, permissions and persistence. Owner props carry registered Workspace identity, display data and narrow navigation/dismissal callbacks. They contain no extension metadata and grant no Host write authority.

Directory adoption is an ordinary creation contribution. The header preserves direct directory picking when no additional entry exists and presents the shared menu when one does. This keeps the existing single-action composition usable while supporting creation plugins without a directory-picker provider. Plugin-owned forms live outside the transient menu, normally in `shell.overlay`.

## Verification

Pure browser and row suites preserve directory adoption, Rename/Delete and Session navigation. The real Loader/Web scenario loads two independent external packages, observes all three contributions, invokes creation and a Workspace action, removes each package and re-enables one without duplication. Its isolated scaffold owns the registry, directories, server and browser. Published declarations, client bundles and the generated Client Slot catalog include the new slots.

## Alternatives considered

A second contribution registry duplicates Cordis effect and slot lifetimes. A single directory-flow replacement cannot expose simultaneous workflows. Base-UI project lookup would couple generic Workspace rendering to an optional extension's identity and storage.

## Consequences

The base plugin remains usable without extensions. Menu contributions unmount on dismissal; persistent operation state and overlays belong to contributors. Detail contributions mount only for expanded real Workspace groups, not Ungrouped, search or flat views. These slots provide UI composition, not durable binding, transactional creation or deletion recovery.
