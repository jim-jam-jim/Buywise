import { test, expect, type APIRequestContext } from '@playwright/test';
const password = 'A-test-password-93!';
const origin = 'http://localhost:3000';
async function signup(request: APIRequestContext, email: string) {
  const response = await request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: { email, password, name: 'Test Shopper' },
  });
  expect(response.ok()).toBeTruthy();
}
async function post(request: APIRequestContext, path: string, data: unknown) {
  return request.post(`/api/${path}`, { headers: { Origin: origin }, data });
}
test('complete product journey persists rules, receipts, comparison, watchlist and export', async ({
  page,
}) => {
  const email = `journey-${Date.now()}@example.com`;
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Aarav');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL('/onboarding');
  await page.getByLabel('Monthly budget (optional)').fill('20000');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('.hero-amount')).toContainText('₹20,000.00');
  await page.getByRole('link', { name: 'Discover', exact: true }).first().click();
  await page.getByLabel('Search catalogue').fill('laptop');
  await expect(page.locator('.product-card')).toHaveCount(3);
  await page
    .locator('.product-card')
    .filter({ hasText: 'Alto Book 14' })
    .getByRole('button', { name: 'Compare', exact: true })
    .click();
  await page
    .locator('.product-card')
    .filter({ hasText: 'Nimbus Air 14' })
    .getByRole('button', { name: 'Compare', exact: true })
    .click();
  await page.locator('.compare-tray').getByRole('link', { name: 'Compare', exact: true }).click();
  await expect(page.locator('.compare-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save comparison' }).click();
  await expect(page.getByText('Comparison saved to history.')).toBeVisible();
  await page.goto('/rules');
  await page.getByRole('button', { name: 'Create rule' }).click();
  await page.getByLabel('Rule name', { exact: true }).fill('My hard limit');
  await page.getByLabel('Amount', { exact: true }).fill('50000');
  await page.getByRole('button', { name: 'Save rule', exact: true }).click();
  await expect(page.locator('.rule-card').filter({ hasText: 'My hard limit' })).toBeVisible();
  await page.goto('/product/nimbus-air-14');
  await page.getByRole('button', { name: 'Review this purchase' }).click();
  await expect(page).toHaveURL(/\/review\//);
  await expect(page.getByRole('button', { name: 'Approve and record' })).toBeDisabled();
  await expect(page.locator('.rule-check').filter({ hasText: 'My hard limit' })).toContainText(
    'Blocked by your rule',
  );
  await page.getByRole('button', { name: 'Reject proposal' }).click();
  await expect(page.getByText('Decision recorded.', { exact: true }).first()).toBeVisible();
  const reviewUrl = page.url();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Download receipt' })).toBeVisible();
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Nimbus Air 14' })).toBeVisible();
  await page.goto('/product/alto-lamp');
  await page.getByRole('button', { name: 'Save & set alert' }).click();
  await page.goto('/watchlist');
  await page.getByLabel('Target price (INR)').fill('3000');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByText('Target saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check demo alerts' }).click();
  await expect(page.getByText('Simulated alert check completed.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Target price (INR)')).toHaveValue('3000');
  await page.goto('/settings/privacy');
  await page.getByLabel('I want to download my personal data to this device.').check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect((await download).suggestedFilename()).toBe('buywise-data.json');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: '.local/dashboard-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.local/dashboard-desktop.png', fullPage: true });
  await page.goto(reviewUrl);
  await expect(page.getByRole('button', { name: 'Download receipt' })).toBeVisible();
  await page.getByRole('button', { name: 'A Aarav Personal workspace' }).click();
  await expect(page).toHaveURL('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/settings/profile');
  await page.getByLabel('Appearance').selectOption('dark');
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Appearance').selectOption('light');
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of [
    '/shop',
    '/compare',
    '/budgets',
    '/rules',
    '/watchlist',
    '/history',
    '/insights',
    '/settings/privacy',
    '/settings/integrations',
    '/product/nimbus-air-14',
  ]) {
    await page.goto(route);
    await expect(page.locator('#main')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `No page overflow on ${route}`,
    ).toBeTruthy();
  }
  expect(
    (await post(page.request, 'delete-account', { confirmation: 'DELETE' })).ok(),
  ).toBeTruthy();
});
test('authorization, CSRF, concurrent approvals, immutable receipts, import and deletion', async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({ baseURL: origin }),
    b = await playwright.request.newContext({ baseURL: origin }),
    anon = await playwright.request.newContext({ baseURL: origin });
  const stamp = Date.now();
  await signup(a, `isolation-a-${stamp}@example.com`);
  await signup(b, `isolation-b-${stamp}@example.com`);
  expect((await anon.get('/api/state')).status()).toBe(401);
  const sa = await (await a.get('/api/state')).json();
  const sb = await (await b.get('/api/state')).json();
  expect(sa.user.id).not.toBe(sb.user.id);
  const budget = await (
    await post(a, 'budgets', {
      scope: 'overall',
      category: null,
      amount: 400000,
      currency: 'INR',
      alertAt: 80,
      enabled: true,
    })
  ).json();
  expect(
    (
      await post(b, `budgets/${budget.id}`, {
        scope: 'overall',
        amount: 1,
        currency: 'INR',
        alertAt: 80,
        enabled: true,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await a.post('/api/budgets', { headers: { Origin: 'https://attacker.example' }, data: {} })
    ).status(),
  ).toBe(403);
  const r1 = await (await post(a, 'reviews', { productId: 'alto-lamp' })).json();
  const r2 = await (await post(a, 'reviews', { productId: 'alto-lamp' })).json();
  expect((await b.get(`/api/reviews/${r1.id}`)).status()).toBe(404);
  expect(
    (await post(b, `reviews/${r1.id}`, { decision: 'approved', reason: 'Other user' })).status(),
  ).toBe(404);
  const decisions = await Promise.all([
    post(a, `reviews/${r1.id}`, { decision: 'approved' }),
    post(a, `reviews/${r2.id}`, { decision: 'approved' }),
  ]);
  expect(decisions.filter((r) => r.ok())).toHaveLength(1);
  expect(decisions.filter((r) => r.status() === 400)).toHaveLength(1);
  const current = await (await a.get('/api/state')).json();
  expect(current.budgets[0].spent).toBe(299000);
  const approved = current.reviews.find((r: { status: string }) => r.status === 'approved');
  expect((await post(a, `reviews/${approved.id}`, { decision: 'rejected' })).status()).toBe(409);
  const unknown = await (await post(a, 'reviews', { productId: 'stride-daypack' })).json();
  expect((await post(a, `reviews/${unknown.id}`, { decision: 'approved' })).status()).toBe(400);
  expect(
    (
      await post(a, `reviews/${unknown.id}`, {
        decision: 'approved',
        reason: 'I acknowledge the missing warranty and return information.',
      })
    ).ok(),
  ).toBeTruthy();
  const bad = await post(a, 'import', {
    csv: 'name,brand,model,category,price,currency,sourceUrl\nUnsafe,A,M,Audio,1,INR,javascript:alert(1)',
    commit: true,
  });
  expect((await bad.json()).imported).toBe(0);
  const csv =
    'name,brand,model,category,price,currency,sourceUrl\nPrivate product,Authorized,M1,Home,123.45,INR,https://example.com/product';
  const preview = await post(a, 'import', { csv, commit: false });
  expect((await preview.json()).rows).toHaveLength(1);
  expect((await (await post(a, 'import', { csv, commit: true })).json()).imported).toBe(1);
  const afterB = await (await b.get('/api/state')).json();
  expect(afterB.products.some((p: { name: string }) => p.name === 'Private product')).toBe(false);
  expect(afterB.reviews).toHaveLength(0);
  expect((await post(a, 'export', { format: 'json', confirmation: false })).status()).toBe(400);
  const exported = await (await post(a, 'export', { format: 'json', confirmation: true })).json();
  expect(exported.download).not.toContain('password');
  expect(JSON.parse(exported.download).reviews.length).toBeGreaterThan(0);
  expect((await post(b, 'delete-account', { confirmation: 'DELETE' })).ok()).toBeTruthy();
  expect((await b.get('/api/state')).status()).toBe(401);
  expect((await a.get('/api/state')).ok()).toBeTruthy();
  const hard = await (
    await post(a, 'rules', {
      name: 'Test ceiling',
      type: 'hard_limit',
      parameters: { amount: 5000000, currency: 'INR' },
      outcome: 'BLOCK',
      enabled: true,
    })
  ).json();
  const laptop = await (await post(a, 'reviews', { productId: 'nimbus-air-14' })).json();
  expect((await (await a.get(`/api/reviews/${laptop.id}`)).json()).verdict).toBe('BLOCK');
  expect(
    (
      await post(a, `reviews/${laptop.id}`, {
        decision: 'approved',
        reason: 'Cannot override hard rules',
      })
    ).status(),
  ).toBe(409);
  await post(a, `rules/${hard.id}`, {
    name: 'Test ceiling',
    type: 'hard_limit',
    parameters: { amount: 5000000, currency: 'INR' },
    outcome: 'BLOCK',
    enabled: false,
  });
  expect((await post(a, `reviews/${laptop.id}/recheck`, {})).ok()).toBeTruthy();
  expect((await (await a.get(`/api/reviews/${laptop.id}`)).json()).verdict).toBe('REVIEW');
  const switched = await post(a, `reviews/${laptop.id}`, {
    decision: 'switch',
    alternativeId: 'alto-book-14',
    reason: 'Prefer a lower-priced comparable laptop.',
  });
  expect(switched.ok()).toBeTruthy();
  const nextReview = await switched.json();
  const oldReview = await (await a.get(`/api/reviews/${laptop.id}`)).json();
  expect(oldReview.status).toBe('switched');
  expect(oldReview.receipt).toBeTruthy();
  const freshReview = await (await a.get(`/api/reviews/${nextReview.id}`)).json();
  expect(freshReview.status).toBe('pending');
  expect(freshReview.switchedFromAmount).toBe(5500000);
  expect((await post(a, 'delete-account', { confirmation: 'DELETE' })).ok()).toBeTruthy();
  await a.dispose();
  await b.dispose();
  await anon.dispose();
});
