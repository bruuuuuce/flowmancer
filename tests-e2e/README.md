Playwright E2E Test Suite

Prerequisites
- Node.js 18+
- Install dependencies: npm install
- Install Playwright browsers: npx playwright install --with-deps

Run tests
- Headless (default): npm run test:e2e
- Headed mode: npm run test:e2e:headed
- CI-friendly reporter: npm run test:e2e:ci

What is covered
- App boot: canvas visible, toolbar buttons, no page errors
- Running toggle: Pause/Play label toggles
- Canvas interactions: drag and wheel without errors
- ELK layout
  - Active path: verifies ELK initialization/layout success log
  - Fallback path: intercepts elk-worker request to force fallback and asserts fallback log
- Overlays
  - Stats: open/close and badges (RPS, In flight)
  - Config: Load baseline JSON, Apply without errors, close
  - Console: execute command (node off svcA) and see output
  - Scripts: Run and verify logs appear in Console
  - PUML: Generate from current and Apply without errors

Notes
- The suite starts a Vite dev server on port 4173 as configured in playwright.config.ts.
- If port is in use, adjust PORT in playwright.config.ts or stop conflicting services.
- Tests rely on visible text in buttons/headings; no app code changes were necessary.
