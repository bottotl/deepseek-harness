---
description: "SPA dist server for the Web shell: claims the webserver fallback seat and serves the built frontend with traversal rejection and SPA index fallback."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-frontend-static

English | [中文](README.zh.md)

## Summary

Serve the built Web shell to browsers from its configured distribution directory. The root, configured index path, and HTML navigations under optional `spaRoutePrefixes` render the bootstrapped index; existing assets outside those prefixes are served directly, while other missing or non-file paths return 404, traversal returns 403, and unsupported methods return 405. Index access requires a valid process token or browser cookie, but static assets remain public. Only one instance can handle unmatched routes at a time; a second activation fails, and unloading the active instance makes unmatched requests return 404.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Compose this plugin in a browser-facing host that serves the built Web shell: it claims the webserver's fallback seat and answers every request no named route matches. Set `distIndex` to the built frontend's `index.html`; applications with History API routes may also set `spaRoutePrefixes`.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-host-frontend-static'
  config:
    distIndex: /absolute/path/to/dist/index.html
```

`distIndex` is an assembly fact of the composing application: [`dsh-web-app`](../../bundle/web-app/README.md) resolves it through the frontend package's exports and mounts this plugin; a deployment never hardcodes it.

`spaRoutePrefixes` is an optional list of absolute path prefixes without trailing slashes (for example, `/workbench`). A matching path, including descendants, renders the index only when the request's `Accept` header includes `text/html`. The default empty list keeps unknown paths at 404. The root prefix `/` is invalid because it would claim every path.

### What the server enforces

Requests are served from the dist root (the directory containing `distIndex`). The dist root, configured index path, and configured HTML navigation paths render `index.html` with HTTP 200; other existing files are served directly with their MIME type, and unknown extensions ship as `application/octet-stream`. A path that resolves outside the root is rejected with 403, so a crafted path cannot read files above the dist. An absent or non-file target outside the configured HTML navigation paths returns an empty 404. Non-GET/HEAD requests without a matching named route are answered 405. Every successful index response is rendered through the webserver's `renderIndex`, so the boot manifest reaches each entry path.

Every index response, including configured SPA navigation, calls `ctx.connection.authorizeIndex` before reading HTML. A valid process token receives a 303 redirect plus the persistent browser cookie; an existing valid cookie serves the index; every other index request receives the Connection-owned 401 response. Non-index files remain public static assets. Connection owns the token, cookie, expiry, and signing-record semantics.

### Observable failures

Traversal returns 403 rather than an error page. An absent or non-file target outside configured SPA navigation returns an empty 404, so unconfigured paths remain explicit failures. Claiming the seat twice throws, and while the seat is unclaimed the webserver answers 404 — which is what a browser sees if this plugin's fiber is disposed.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Design concept

The package is one function plugin around `serveStatic`: `apply` resolves the dist root from `distIndex`, builds a `renderIndex` closure that runs `ctx.webServer.renderIndex` over the raw `index.html`, and registers the fallback handler under an effect scope. The seat is single-owner by the webserver's contract — a second registration throws — and effect-scoped, so disposing the fiber releases the seat.

### The traversal fence

`serveStatic` normalizes the requested pathname and joins it to the dist root, then requires the target to be the root itself or stay under it. The check uses `sep` rather than `/` because `resolve()` emits backslash paths on Windows, where a `/` suffix would reject every legitimate subpath as traversal.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | `serveStatic` and `apply`: fallback claim, traversal rejection, index rendering, MIME table |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these when the serving contract is not enough: the seat owner's contract, then the composition that resolves the dist and the subsystem reference.

- [Webserver](../webserver/README.md) — the fallback seat this plugin claims and the index taps it runs.
- [dsh-web-app bundle](../../bundle/web-app/README.md) — the application that resolves `distIndex` and mounts this plugin.
- [HTTP server subsystem](../../../docs/subsystems/web-server.md) — how the fallback seat fits the route tables.
- [Generated configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-host-frontend-static) — every accepted config field and its source declaration.

-----

<a id="model-experience"></a>
## Model Experience

None, as the SPA dist server answers browser asset requests and registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define when a served asset class is not yet covered. They are current package constraints, not a task backlog.

- **The starter MIME table is minimal** — it covers the Vite-emitted asset set plus the shipped PWA manifest; other extensions fall back to `application/octet-stream` until an asset class ships.
- **Pathname routing is explicit** — applications with History API routes must configure their route prefixes; unlisted paths do not receive the shell.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The only owned relation is the single fallback seat, which cannot be probed from the teardown stream — `internal/plugin` fires before the disposing fiber's effects run, so the legitimate owner still holds the seat at notification time and any claim probe would false-positive on every correct disposal (unlike the webserver companion, whose reserved-path probes never collide with a live registration). The seat's register/release symmetry is covered by the package's real-composition HMR-safety test instead.
