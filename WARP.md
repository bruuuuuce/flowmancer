# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: traffic-sim-vue (Vue 3 + Vite) — interactive, in-browser traffic simulator over a service graph with ELK.js-based auto layout and multiple overlays (Stats, Config JSON, Console, Scripts, PUML, ELK settings).

Commands
- Install deps (Node 18+ required)
  - npm install
- Dev server
  - npm run dev
  - Opens at http://localhost:5173 by default
- Build and preview
  - npm run build
  - npm run preview (serves build at http://localhost:4173)
- Unit tests (Vitest)
  - Interactive watch: npm run test
  - Headless CI run: npm run test:run
  - UI runner: npm run test:ui
  - Run a single test file: npx vitest run tests/path/to/file.spec.ts
  - Filter by test name: npx vitest -t "partial test name"
  - Coverage (text + html): npx vitest run --coverage
- E2E tests (Playwright)
  - First time (install browsers): npx playwright install --with-deps
  - Headless: npm run test:e2e
  - Headed: npm run test:e2e:headed
  - CI reporter: npm run test:e2e:ci
  - Single spec: npx playwright test tests-e2e/elk.spec.ts --project=chromium --headed
  - Note: Playwright config launches Vite dev server on port 4173
- Linting
  - No linter is configured in package.json; none required for CI tasks here.

Architecture overview
High-level runtime composition
- Entry and mounting
  - src/main.ts creates and mounts the Vue app with App.vue as the root component.
- Root canvas and overlays
  - src/ui/App.vue renders a full-screen canvas and a bottom-left Toolbar (src/ui/components/Toolbar.vue).
  - Overlays are separate Vue components in src/ui/components/overlays/* and are toggled from the Toolbar:
    - StatsOverlay.vue — shows global metrics (RPS, inflight) and simple per-link throughput table.
    - ConfigOverlay.vue — textarea bound to JSON config; can load baseline.json from public/ and apply to runtime.
    - ConsoleOverlay.vue — accepts simple commands (e.g., node off svcA) and prints output log lines.
    - ScriptsOverlay.vue — freeform script text area with a Run action (logs routed to Console).
    - PumlOverlay.vue — PlantUML text apply/generate roundtrip.
    - ElkOverlay.vue — exposes ELK layout algorithm, direction, spacing, and routing options as reactive model.
  - Overlay window system is implemented in App.vue:
    - Modes: normal | floating | fullscreen per overlay (overlayModes reactive map).
    - Positioning: computed defaults for normal mode; draggable positions stored per overlay in overlayPositions.
    - Drag behavior only enabled in floating mode, with document-level mouse handlers.

Layout engine (ELK.js) and fallbacks
- Initialization
  - App.vue imports ELK bundle: import * as ELKNS from 'elkjs/lib/elk.bundled.js'.
  - Worker URL is referenced as new URL('elkjs/lib/elk-worker.js?url', import.meta.url).
  - A defensive resolveElkCtor() picks the correct ELK constructor across different bundling shapes.
- Worker and bundler accommodations
  - Vite resolves 'web-worker' alias to ./src/mock-web-worker.js (vite.config.ts). ELK uses a web worker; the mock provides a safe fallback when workers are unavailable.
  - optimizeDeps excludes 'web-worker' and 'elkjs' to avoid pre-bundling issues, and rollup externalizes 'web-worker'.
- Runtime behavior
  - initializeELK() tries to construct ELK with the worker; on failure, the app logs the error and proceeds with a fallback layout path, keeping the UI functional.
  - Playwright tests exercise both the successful layout path and the fallback path (tests-e2e/elk.spec.ts).

Traffic/path generation model (in App.vue)
- Path computation
  - calculateAllPaths(): DFS computes all simple paths from Ingress nodes to Sink nodes using an adjacency map built from the current config.
  - Guards against path explosion (MAX_PATHS) and accepts terminal nodes with no out-edges as sinks, so new leaves start receiving traffic immediately.
- Traffic distribution logic
  - getPathsForTrafficGeneration():
    - If any LoadBalancer nodes appear on computed paths, spawn uses a single randomly selected path per tick (simulating LB behavior).
    - Otherwise, non-load-balanced scenarios fan out to all available paths.
  - getRandomPath() selects uniformly from the all-paths set when in LB mode.
- Metrics
  - Per-edge metrics map records event counts, error counts (1s window), and an EMA of per-edge latency.
  - Global stats (RPS, inflight) and linkStats are shown in StatsOverlay.

Engine primitives (src/engine/*)
- Foundational types and building blocks are present but lightly integrated in the current UI flow.
  - types.ts: message wire model, node kinds, timing units, hop costs, and TickCtx.
  - nodes.ts: BaseNode with queue, concurrency, busy workers, warmup behavior; extensible serviceTime hooks.
  - link.ts: bidirectional Link with per-direction token bucket state and FIFO; makeLink() factory.
  - queue.ts: simple FIFO/tail_drop queue abstraction with tryEnqueue/dequeue.
  - graph.ts: Graph with node/link storage and utilities to find link directions.
  - engine.ts: stubs for Ingress/Service/Cache derived from BaseNode and RNG; contains placeholder code not used by the app’s current canvas simulation.
- Note: engine.ts includes a stubbed function (dirSend) with placeholder code; this is not executed by the current UI and can be treated as a future expansion area for a full simulation loop.

Testing strategy
- Unit tests are configured via Vitest with jsdom and a test setup (tests/setup.ts):
  - Provides DOM cleanup, raf polyfill, scrollTo and Worker mocks.
  - vitest.config.ts includes aliases for 'web-worker' and '@engine'.
- E2E tests via Playwright (tests-e2e/*) focus on user-visible and integration behavior:
  - basic.spec.ts: app boot, toolbar presence, drag/wheel interactions, no page errors.
  - elk.spec.ts: validates ELK success logs and fallback path without breaking the app.
  - overlays.spec.ts: opens/uses each overlay and verifies behaviors (Config baseline load/apply, Console commands, Scripts run, PUML generate/apply, Stats badges).
  - playwright.config.ts runs a Vite dev server on a fixed port (4173), sets baseURL, parallel projects (Chromium/Firefox/WebKit), and artifacts on failure.

Notable configuration and conventions
- Vite (vite.config.ts)
  - define.global = 'globalThis' for compatibility.
  - Aliases: 'web-worker' -> src/mock-web-worker.js.
  - optimizeDeps.exclude: ['web-worker', 'elkjs'] to avoid prebundle issues.
- Vitest (vitest.config.ts)
  - environment: jsdom, setupFiles: tests/setup.ts, include tests/**/*.spec|test.ts, excludes e2e and build artifacts.
  - Aliases: 'web-worker' and '@engine'.
- TypeScript (tsconfig.json)
  - Paths mapping: @engine/* -> src/engine/*.

Operational notes for ELK worker file name
- The ELK worker file name can differ across releases (elk-worker.js vs elk-worker.min.js). App.vue documents this; if you see a 404 in console, update the workerUrl constant accordingly:
  - const workerUrl = new URL('elkjs/lib/elk-worker.js?url', import.meta.url)
  - Switch to elk-worker.min.js if needed.

Repository docs & gaps
- README.md provides accurate commands and explains the ELK worker note. It references a docs/ directory for deeper documentation that is not present in the repo; rely on code and tests for authoritative behavior.

What to prioritize when making changes
- Keep overlay mode/drag APIs stable (App.vue <-> overlays/* rely on consistent props and events).
- Preserve Vite/Vitest aliasing for 'web-worker' and '@engine' to keep ELK and tests working.
- When modifying ELK initialization or worker URL handling, re-run the E2E suite (elk.spec.ts) to validate both normal and fallback paths.

