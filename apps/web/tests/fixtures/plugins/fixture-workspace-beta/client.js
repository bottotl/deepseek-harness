/** Independent plugin contributing through the published Workspace slot names. */
window.__ModuleLoader__.load({
  id: '@fixture/workspace-beta',
  factory(require) {
    const React = require('react')
    const { MenuItemButton } = require('@deepseek-ai/dsh-client-ui-primitives')
    function CreateAction({ onDismiss, onCreated, create, t }) {
      return React.createElement(MenuItemButton, { onSelect() {
        onDismiss()
        void create().then(workspace => onCreated(workspace.workspaceId))
      } }, t('create'))
    }
    function WorkspaceAction({ workspaceId, path, displayTitle, onDismiss, t }) {
      return React.createElement(MenuItemButton, { onSelect() {
        document.documentElement.dataset.workspaceAction = JSON.stringify({ plugin: '@fixture/workspace-beta', workspaceId, path, displayTitle })
        onDismiss()
      } }, t('action'))
    }
    function Detail({ workspaceId, path, t }) {
      return React.createElement('div', { 'data-workspace-extension': 'beta', 'data-workspace-id': workspaceId }, t('detail') + ': ' + path)
    }
    return {
      inject: ['slots', 'locale', 'workspaces'],
      apply(ctx) {
        const namespace = 'fixtureWorkspaceBeta'
        ctx.effect(() => ctx.locale.register(namespace, {
          en: { create: 'Create with Beta', action: 'Beta action', detail: 'Beta detail' },
          zh: { create: '通过 Beta 创建', action: 'Beta 操作', detail: 'Beta 详情' },
        }))
        for (const [name, Component] of [
          ['sidebar.workspaces.create.action', CreateAction],
          ['sidebar.workspaces.workspace.menu.item', WorkspaceAction],
          ['sidebar.workspaces.workspace.detail', Detail],
        ]) {
          ctx.slots.inject(name, () => ctx.slots.register({
            name, id: '@fixture/workspace-beta', locale: namespace,
            inject: () => ({ create: () => ctx.workspaces.create({ path: document.documentElement.dataset.fixtureBetaPath }) }),
          }, Component))
        }
      },
    }
  },
})
