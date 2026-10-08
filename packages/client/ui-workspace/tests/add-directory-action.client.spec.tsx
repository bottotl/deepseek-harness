// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { GlobalStandardProps } from '@deepseek-ai/dsh-client-ui-slots'
import { AddDirectoryAction } from '../src/client/workspace-actions/AddDirectoryAction.tsx'

afterEach(cleanup)

const unusedGlobalHook = (): never => { throw new Error('The directory action must only use its directory-flow hook.') }
const standard: GlobalStandardProps = {
  usePanelInfo: unusedGlobalHook, useSessions: unusedGlobalHook, useSessionStatus: unusedGlobalHook,
  useSessionRetainInfo: unusedGlobalHook, useResource: unusedGlobalHook, useWorkspaces: unusedGlobalHook,
}

it('hides directory adoption when no directory flow provider is available', () => {
  const { container } = render(<AddDirectoryAction {...standard} onDismiss={vi.fn()} onAddDirectory={vi.fn()}
    onCreated={vi.fn()} useDirectoryFlow={select => select(false)} t={key => key} />)
  expect(container.childElementCount).toBe(0)
})

it('dismisses the creation menu before requesting directory adoption', () => {
  const calls: string[] = []
  render(<AddDirectoryAction {...standard} onDismiss={() => calls.push('dismiss')} onAddDirectory={() => calls.push('adopt')}
    onCreated={vi.fn()} useDirectoryFlow={select => select(true)} t={() => 'Adopt a directory'} />)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Adopt a directory' }))
  expect(calls).toEqual(['dismiss', 'adopt'])
})
