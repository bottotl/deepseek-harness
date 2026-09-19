import { describe, expect, it } from 'vitest'
import { packedConsumerManifest } from './verify-packed-install.ts'

describe('packed release consumer', () => {
  it('installs only the family entry while pinning all reachable first-party packages to tarballs', () => {
    const packed = new Map([
      ['@deepseek-ai/dsh', { url: 'file:///packed/dsh.tgz', version: '1.0.0' }],
      ['@deepseek-ai/dsh-runtime', { url: 'file:///packed/runtime.tgz', version: '1.0.0' }],
      ['@deepseek-ai/dsh-experimental-probe', { url: 'file:///packed/experimental.tgz', version: '1.0.0' }],
    ])

    expect(packedConsumerManifest('@deepseek-ai/dsh', packed)).toEqual({
      name: 'dsh-packed-install-consumer',
      version: '0.0.0',
      private: true,
      dependencies: { '@deepseek-ai/dsh': 'file:///packed/dsh.tgz' },
      overrides: {
        '@deepseek-ai/dsh': 'file:///packed/dsh.tgz',
        '@deepseek-ai/dsh-runtime': 'file:///packed/runtime.tgz',
        '@deepseek-ai/dsh-experimental-probe': 'file:///packed/experimental.tgz',
      },
    })
  })

  it('rejects a missing family entry before allocating an install', () => {
    expect(() => packedConsumerManifest('@deepseek-ai/dsh', new Map()))
      .toThrow('@deepseek-ai/dsh is not among the packed tarballs')
  })
})
