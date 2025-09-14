import { test, expect } from '@playwright/test';

// Helper to capture console logs and errors
function captureConsole(page) {
  const messages: string[] = [];
  const errors: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    messages.push(text);
  });
  page.on('pageerror', (err) => {
    errors.push(String(err));
  });
  return { messages, errors };
}

test('app loads, canvas visible, toolbar buttons present, no page errors', async ({ page }) => {
  const { messages, errors } = captureConsole(page);

  await page.goto('/');

  // Canvas is present and visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // Toolbar buttons
  await expect(page.getByRole('button', { name: /pause|play/i })).toBeVisible();
  for (const name of ['Stats', 'Config', 'Console', 'Scripts', 'PUML']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }

  // Allow app to settle
  await page.waitForTimeout(500);

  // There should be no page errors
  expect(errors, `Page errors found: ${errors.join('\n')}`).toHaveLength(0);
});

test('running toggle changes button label', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /pause|play/i });
  const initial = await toggle.textContent();
  await toggle.click();
  await expect(toggle).not.toHaveText(initial || '');
  await toggle.click();
  await expect(toggle).toHaveText(initial || /pause|play/i);
});

test('canvas supports drag and wheel without errors', async ({ page }) => {
  const { errors } = captureConsole(page);
  await page.goto('/');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 20, { steps: 10 });
    await page.mouse.up();
  }

  // Dispatch a wheel event to the canvas via script (Playwright API lacks mouse.wheel in some versions)
  await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (c) {
      const evt = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
      c.dispatchEvent(evt);
    }
  });

  await page.waitForTimeout(200);
  expect(errors, `Errors after interactions: ${errors.join('\n')}`).toHaveLength(0);
});
