/** Directory adoption is an ordinary creation-menu contribution. */
import { MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DirectoryPickingHooks } from '../contract/slots.ts'

type Props = PropsRuntime<'sidebar.workspaces.create.action'> & PropsLocale<'workspace'> & DirectoryPickingHooks

/**
 * Hide the action when no directory-flow provider is available.
 * @param props - creation owner, locale, and directory-flow occupancy hook.
 * @returns the adoption action, or null.
 */
export function AddDirectoryAction({ onDismiss, onAddDirectory, useDirectoryFlow, t }: Props) {
  const available = useDirectoryFlow(value => value)
  if (!available) return null
  return <MenuItemButton onSelect={() => { onDismiss(); onAddDirectory() }}>{t('workspace.add')}</MenuItemButton>
}
