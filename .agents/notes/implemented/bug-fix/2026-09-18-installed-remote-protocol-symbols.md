# Agent Note: Recognize installed Remote protocol exports

Status: implemented

English | [中文](2026-09-18-installed-remote-protocol-symbols.zh.md)

## Problem

An external package can compile against the published Typert protocol while its Remote generation returns no artifacts. Installed declaration files have no workspace registration and do not use the ambient module declaration that in-repository fixtures carry, so neither former recognition path identifies their markers.

## Decision

The analyzer resolves the canonical protocol module from the consuming source file through its existing TypeScript module-resolution cache. It compares the candidate's resolved symbol with the named public export's resolved symbol. Workspace and ambient declaration recognition remain available. The same recognition applies to Remote decorators, Service bindings, and lookup or Context protocol types.

## Alternatives considered

**Matching the symbol name alone.** Another dependency can export a decorator named Remote; that name does not grant it Typert semantics. Symbol equality preserves the owner.

**Adding the protocol as a workspace project.** Published consumers own only their declarations and package exports. Requiring protocol source or an ambient replacement would hide the installed-package failure instead of supporting that consumer.

## Consequences

Standalone package builds can use the published dependency directly. Existing workspace generation retains its source ownership rules; dependency types do not become workspace-owned types. The [Remote model tests](../../../../packages/typert/generator/tests/remote-model.spec.ts) cover installed declarations and a foreign same-name decorator. No runtime dispatch or wire format changes.
