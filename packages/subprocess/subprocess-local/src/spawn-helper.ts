/** Pre-spawn validation and repair of node-pty's in-package macOS spawn-helper. */

import * as fs from 'node:fs'
import type { Stats } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'

/**
 * Resolve the installed node-pty package entry through this package's own
 * dependency resolution; the helper path is always derived from it, never
 * accepted as input.
 * @returns absolute path of node-pty's main entry.
 */
export function resolveInstalledNodePtyEntry(): string {
  return createRequire(import.meta.url).resolve('node-pty')
}

/** Inputs of one spawn-helper check; the runtime supplies the production wiring. */
export interface NodePtySpawnHelperCheck {
  platform: NodeJS.Platform
  arch: string
  execPath: string
  geteuid?: (() => number) | undefined
  resolveNodePtyEntry(): string
}

/**
 * Ensure node-pty's in-package spawn-helper stays executable before a PTY
 * spawn. macOS execs the helper through `posix_spawn`, and installs restored
 * without lifecycle scripts can lose its executable bit, so this check repairs
 * that bit in place of the removed postinstall. Only the owner's execute bit
 * satisfies the check, matching the kernel's owner-first permission test. It
 * fails closed: a missing or unreadable helper, a symlink, a non-regular file,
 * a path resolving outside the node-pty package, or a file that is not owned
 * by the current user and owner-private writable is reported instead of
 * bypassed or modified, so read-only and code-signed application layouts stay
 * intact. An explicit helper override — `DSH_NODE_PTY_SPAWN_HELPER` or a
 * `<executable>-spawn-helper` sibling, matching patched node-pty's precedence —
 * skips the check because node-pty then never execs the in-package helper.
 * @param check - platform, architecture, identity, and node-pty entry resolution.
 * @throws when the helper node-pty would exec is missing, fails validation, or cannot be repaired.
 */
export function ensureNodePtySpawnHelper(check: NodePtySpawnHelperCheck): void {
  if (check.platform !== 'darwin') return
  if (process.env.DSH_NODE_PTY_SPAWN_HELPER) return
  if (fs.existsSync(`${check.execPath}-spawn-helper`)) return
  // Without an identity source the helper cannot be proven owner-private, so
  // the ownership comparison below fails closed against `undefined`.
  const euid = check.geteuid?.()
  const packageRoot = fs.realpathSync(dirname(dirname(check.resolveNodePtyEntry())))
  const helper = nodePtyHelperPath(packageRoot, check.arch)
  if (helper === undefined) return
  const info = readHelperInfo(helper)
  if (info.isSymbolicLink()) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} is a symlink`)
  }
  if (!info.isFile()) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} is not a regular file`)
  }
  if (relative(packageRoot, fs.realpathSync(helper)).startsWith('..')) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} resolves outside the node-pty package`)
  }
  // Only the owner bit satisfies exec: posix_spawn runs as the file owner, so
  // exec stays denied while the owner bit is clear even if group or other may exec.
  if ((info.mode & 0o100) !== 0) return
  if (info.uid !== euid) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} is not owned by the current user`)
  }
  if ((info.mode & 0o200) === 0) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} is not owner-writable`)
  }
  if ((info.mode & 0o022) !== 0) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} is group- or other-writable`)
  }
  repairHelperMode(helper, info)
}

function nodePtyHelperPath(packageRoot: string, arch: string): string | undefined {
  for (const dir of ['build/Release', 'build/Debug', `prebuilds/darwin-${arch}`]) {
    if (fs.existsSync(join(packageRoot, dir, 'pty.node'))) return join(packageRoot, dir, 'spawn-helper')
  }
  return undefined
}

function readHelperInfo(helper: string): Stats {
  try {
    return fs.lstatSync(helper)
  } catch (error) {
    throw new Error(`subprocess-local: node-pty spawn helper is missing or unreadable at ${helper}`, { cause: error })
  }
}

// Repair through an O_NOFOLLOW descriptor, never the path: chmod on the path
// would follow a symlink swapped in after lstat and modify the replacement's
// target, while fchmod cannot reach past the opened inode. O_NONBLOCK keeps
// the open from blocking on a swapped-in FIFO, and the fstat comparison proves
// the opened inode is still the validated one before any modification.
function repairHelperMode(helper: string, info: Stats): void {
  let fd: number
  try {
    fd = fs.openSync(helper, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK)
  } catch (error) {
    throw new Error(`subprocess-local: node-pty spawn helper ${helper} cannot be opened for permission repair`, { cause: error })
  }
  try {
    const opened = fs.fstatSync(fd)
    if (opened.dev !== info.dev || opened.ino !== info.ino) {
      throw new Error(`subprocess-local: node-pty spawn helper ${helper} was replaced during permission repair`)
    }
    fs.fchmodSync(fd, (info.mode & 0o7777) | 0o111)
  } finally {
    fs.closeSync(fd)
  }
}
