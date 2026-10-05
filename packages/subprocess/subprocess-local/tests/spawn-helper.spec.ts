import { chmodSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import type { NodePtySpawnHelperCheck } from '@deepseek-ai/dsh-subprocess-local/src/spawn-helper.ts'
import {
  ensureNodePtySpawnHelper,
  resolveInstalledNodePtyEntry,
} from '@deepseek-ai/dsh-subprocess-local/src/spawn-helper.ts'

// A plain re-export routes node:fs through the mock registry, whose namespace
// the replacement-race tests below can spy on; behavior stays the real module's.
vi.mock('node:fs', async (importOriginal) => {
  const native = await importOriginal<typeof import('node:fs')>()
  return { ...native }
})

const tempRoots: string[] = []

/** A fresh temp directory in its symlink-resolved form, so assertion paths match `realpathSync` inside the check. */
function tempDir(): string {
  const root = realpathSync(mkdtempSync(join(realpathSync(tmpdir()), 'dsh-spawn-helper-')))
  tempRoots.push(root)
  return root
}

afterEach(() => {
  vi.unstubAllEnvs()
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/** A fake installed node-pty package with one prebuilds spawn-helper at `mode`. */
function nodePtyFixture(helperMode?: number): { root: string; helper: string } {
  const root = tempDir()
  const prebuilds = join(root, 'node-pty', 'prebuilds', 'darwin-arm64')
  mkdirSync(join(root, 'node-pty', 'lib'), { recursive: true })
  mkdirSync(prebuilds, { recursive: true })
  writeFileSync(join(root, 'node-pty', 'lib', 'index.js'), '')
  writeFileSync(join(prebuilds, 'pty.node'), '')
  const helper = join(prebuilds, 'spawn-helper')
  if (helperMode !== undefined) {
    writeFileSync(helper, '')
    chmodSync(helper, helperMode)
  }
  return { root, helper }
}

function check(
  fixture: { root: string },
  overrides: Partial<NodePtySpawnHelperCheck> = {},
): NodePtySpawnHelperCheck {
  return {
    platform: 'darwin',
    arch: 'arm64',
    execPath: '/nonexistent-runtime',
    geteuid: () => process.geteuid?.() ?? 0,
    resolveNodePtyEntry: () => join(fixture.root, 'node-pty', 'lib', 'index.js'),
    ...overrides,
  }
}

const helperMode = (path: string): number => lstatSync(path).mode & 0o777

describe('ensureNodePtySpawnHelper', () => {
  it('restores the executable bit on an owner-private writable helper', () => {
    const fixture = nodePtyFixture(0o644)
    ensureNodePtySpawnHelper(check(fixture))
    expect(helperMode(fixture.helper)).toBe(0o755)
  })

  it('leaves an already executable helper untouched', () => {
    const fixture = nodePtyFixture(0o755)
    ensureNodePtySpawnHelper(check(fixture))
    expect(helperMode(fixture.helper)).toBe(0o755)
  })

  it('repairs a helper only group and other may exec', () => {
    const fixture = nodePtyFixture(0o655)
    ensureNodePtySpawnHelper(check(fixture))
    expect(helperMode(fixture.helper)).toBe(0o755)
  })

  it('fails closed when only group and other may exec and the helper is read-only', () => {
    const fixture = nodePtyFixture(0o455)
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is not owner-writable`)
    expect(helperMode(fixture.helper)).toBe(0o455)
  })

  it('fails closed on a missing helper', () => {
    const fixture = nodePtyFixture()
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper is missing or unreadable at ${fixture.helper}`)
  })

  it('fails closed on a symlinked helper', () => {
    const fixture = nodePtyFixture(0o755)
    rmSync(fixture.helper)
    const target = join(fixture.root, 'helper-target')
    writeFileSync(target, '')
    symlinkSync(target, fixture.helper)
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is a symlink`)
  })

  it('fails closed on a helper that is not a regular file', () => {
    const fixture = nodePtyFixture()
    mkdirSync(fixture.helper)
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is not a regular file`)
  })

  it('fails closed when the helper resolves outside the node-pty package', () => {
    const root = tempDir()
    const outside = join(root, 'outside')
    mkdirSync(join(root, 'node-pty', 'lib'), { recursive: true })
    mkdirSync(join(root, 'node-pty', 'prebuilds'), { recursive: true })
    mkdirSync(outside, { recursive: true })
    writeFileSync(join(root, 'node-pty', 'lib', 'index.js'), '')
    writeFileSync(join(outside, 'pty.node'), '')
    writeFileSync(join(outside, 'spawn-helper'), '')
    chmodSync(join(outside, 'spawn-helper'), 0o755)
    symlinkSync(outside, join(root, 'node-pty', 'prebuilds', 'darwin-arm64'))
    const prebuildsLink = join(root, 'node-pty', 'prebuilds', 'darwin-arm64')
    expect(() => { ensureNodePtySpawnHelper(check({ root })) })
      .toThrow(`node-pty spawn helper ${join(prebuildsLink, 'spawn-helper')} resolves outside the node-pty package`)
  })

  it('fails closed on a helper owned by another user', () => {
    const fixture = nodePtyFixture(0o644)
    expect(() => { ensureNodePtySpawnHelper(check(fixture, { geteuid: () => (process.geteuid?.() ?? 0) + 12345 })) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is not owned by the current user`)
    expect(helperMode(fixture.helper)).toBe(0o644)
  })

  it('fails closed when no effective-uid source is provided', () => {
    const fixture = nodePtyFixture(0o644)
    const { geteuid: _absent, ...withoutIdentity } = check(fixture)
    expect(() => { ensureNodePtySpawnHelper(withoutIdentity) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is not owned by the current user`)
    expect(helperMode(fixture.helper)).toBe(0o644)
  })

  it('fails closed on a read-only helper', () => {
    const fixture = nodePtyFixture(0o444)
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is not owner-writable`)
    expect(helperMode(fixture.helper)).toBe(0o444)
  })

  it('fails closed on a group- or other-writable helper', () => {
    const fixture = nodePtyFixture(0o666)
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} is group- or other-writable`)
    expect(helperMode(fixture.helper)).toBe(0o666)
  })

  it('fails closed without touching the target when a symlink is swapped in before repair', async () => {
    const fixture = nodePtyFixture(0o644)
    const victim = join(fixture.root, 'victim')
    writeFileSync(victim, '')
    chmodSync(victim, 0o644)
    const native = await vi.importActual<typeof import('node:fs')>('node:fs')
    const mocked = vi.spyOn(fs, 'openSync').mockImplementation((path, flags, mode) => {
      if (path === fixture.helper) {
        rmSync(fixture.helper)
        symlinkSync(victim, fixture.helper)
      }
      return native.openSync(path, flags, mode)
    })
    onTestFinished(() => { mocked.mockRestore() })
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} cannot be opened for permission repair`)
    expect(helperMode(victim)).toBe(0o644)
  })

  it('fails closed when a different file replaces the helper before repair', async () => {
    const fixture = nodePtyFixture(0o644)
    const native = await vi.importActual<typeof import('node:fs')>('node:fs')
    const mocked = vi.spyOn(fs, 'openSync').mockImplementation((path, flags, mode) => {
      if (path === fixture.helper) {
        rmSync(fixture.helper)
        writeFileSync(fixture.helper, '')
        chmodSync(fixture.helper, 0o600)
      }
      return native.openSync(path, flags, mode)
    })
    onTestFinished(() => { mocked.mockRestore() })
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) })
      .toThrow(`node-pty spawn helper ${fixture.helper} was replaced during permission repair`)
    expect(helperMode(fixture.helper)).toBe(0o600)
  })

  it('skips the check when no native module directory exists', () => {
    const root = tempDir()
    mkdirSync(join(root, 'node-pty', 'lib'), { recursive: true })
    writeFileSync(join(root, 'node-pty', 'lib', 'index.js'), '')
    expect(() => { ensureNodePtySpawnHelper(check({ root })) }).not.toThrow()
  })

  it('skips the in-package helper when DSH_NODE_PTY_SPAWN_HELPER is set', () => {
    const fixture = nodePtyFixture(0o644)
    vi.stubEnv('DSH_NODE_PTY_SPAWN_HELPER', '/override/spawn-helper')
    expect(() => { ensureNodePtySpawnHelper(check(fixture)) }).not.toThrow()
    expect(helperMode(fixture.helper)).toBe(0o644)
  })

  it('skips the in-package helper when a runtime executable sibling exists', () => {
    const fixture = nodePtyFixture(0o644)
    const runtime = join(fixture.root, 'sdk-runtime')
    writeFileSync(`${runtime}-spawn-helper`, '')
    expect(() => { ensureNodePtySpawnHelper(check(fixture, { execPath: runtime })) }).not.toThrow()
    expect(helperMode(fixture.helper)).toBe(0o644)
  })

  it('skips non-macOS platforms', () => {
    const fixture = nodePtyFixture(0o644)
    ensureNodePtySpawnHelper(check(fixture, { platform: 'linux' }))
    expect(helperMode(fixture.helper)).toBe(0o644)
  })
})

describe('resolveInstalledNodePtyEntry', () => {
  it('resolves the installed node-pty entry through this package', () => {
    expect(resolveInstalledNodePtyEntry().endsWith(join('node-pty', 'lib', 'index.js'))).toBe(true)
  })
})
