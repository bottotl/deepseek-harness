/** External plugins compose beside the shipped Workspace UI and follow Loader lifetimes. */
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { launchWebScaffold, watchConsole } from './scaffold.ts'
import { newEnglishPage } from './support.ts'

const fixtures = ['alpha', 'beta'].map(name => fileURLToPath(new URL(`./fixtures/plugins/fixture-workspace-${name}/package.json`, import.meta.url)))

it('composes two Workspace creation, action and detail contributions and removes each independently', async () => {
  const scaffold = await launchWebScaffold({ extraInstallAnchors: fixtures })
  onTestFinished(() => scaffold.close())
  const paths = ['alpha', 'beta'].map(name => join(scaffold.workspaceCwd, `extension-${name}`))
  await Promise.all(paths.map(path => mkdir(path)))
  const entries = await Promise.all(['alpha', 'beta'].map((name, index) => scaffold.ctx.loader.create({
    name: `@fixture/workspace-${name}`, config: { path: paths[index] },
  })))
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await newEnglishPage(browser)
  const console = watchConsole(page)
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await page.evaluate((paths) => {
    document.documentElement.dataset.fixtureAlphaPath = paths[0]
    document.documentElement.dataset.fixtureBetaPath = paths[1]
  }, paths)
  const add = page.getByRole('button', { name: 'Add workspace', exact: true })
  await add.click()
  const menu = page.getByRole('menu')
  await menu.getByRole('menuitem', { name: 'Create with Alpha', exact: true }).waitFor()
  expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Create with Alpha', 'Create with Beta', 'Add workspace'])
  await menu.getByRole('menuitem', { name: 'Create with Alpha', exact: true }).click()
  await expect.poll(() => scaffold.ctx.workspaceRegistry.resolveByPath(paths[0]!)).not.toBeUndefined()
  const workspace = (await scaffold.ctx.workspaceRegistry.resolveByPath(paths[0]!))!
  const detail = page.locator('[data-workspace-extension="alpha"]')
  await detail.waitFor()
  expect(await detail.getAttribute('data-workspace-id')).toBe(workspace.id)
  expect(await page.locator('[data-workspace-extension="beta"]').count()).toBe(1)
  const actions = page.getByRole('button', { name: 'Workspace actions for extension-alpha', exact: true })
  await page.getByRole('treeitem').filter({ has: page.getByText('extension-alpha', { exact: true }) }).first().hover()
  await actions.click()
  expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Rename', 'Delete workspace', 'Alpha action', 'Beta action'])
  await menu.getByRole('menuitem', { name: 'Beta action', exact: true }).click()
  await expect.poll(() => menu.count()).toBe(0)
  expect(await page.evaluate(() => JSON.parse(document.documentElement.dataset.workspaceAction!))).toEqual({
    plugin: '@fixture/workspace-beta', workspaceId: workspace.id, path: workspace.path, displayTitle: 'extension-alpha',
  })

  scaffold.ctx.loader.remove(entries[0]!)
  await expect.poll(() => detail.count()).toBe(0)
  expect(await page.locator('[data-workspace-extension="beta"]').count()).toBe(1)
  await add.click()
  expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Create with Beta', 'Add workspace'])
  await page.keyboard.press('Escape')
  // Re-enabling must add exactly one contribution per position.
  const restored = await scaffold.ctx.loader.create({ name: '@fixture/workspace-alpha', config: { path: paths[0] } })
  await detail.waitFor()
  expect(await detail.count()).toBe(1)
  scaffold.ctx.loader.remove(restored)
  scaffold.ctx.loader.remove(entries[1]!)
  await expect.poll(() => page.locator('[data-workspace-extension]').count()).toBe(0)
  await page.getByRole('treeitem').filter({ has: page.getByText('extension-alpha', { exact: true }) }).first().hover()
  await actions.click()
  expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Rename', 'Delete workspace'])
  await page.keyboard.press('Escape')
  await add.click()
  await page.getByRole('dialog', { name: 'Select Workspace Directory' }).waitFor()
  expect(await menu.count()).toBe(0)
  expect(console.pageErrors).toEqual([])
}, 120_000)
