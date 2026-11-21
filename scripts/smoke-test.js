// Smoke tests — run with: npm test   (or: npm run smoke)
//
// Two suites:
//  1. Static checks (always run): `node --check` on every src/ + scripts/ file,
//     so a syntax error is caught even with no database and no running server.
//  2. Live HTTP checks (run when a server answers at BASE_URL, default
//     http://localhost:3000): public endpoints, auth guards, validation, and
//     the Stripe-not-configured 503. If no server is reachable, the live
//     suite is SKIPPED with an honest message instead of failing.
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');

const execFileAsync = promisify(execFile);
const ROOT = path.join(__dirname, '..');
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

describe('static checks — every source file parses', () => {
  const files = [...collectJsFiles(path.join(ROOT, 'src')), ...collectJsFiles(path.join(ROOT, 'scripts'))];
  for (const file of files) {
    test(`node --check ${path.relative(ROOT, file)}`, async () => {
      await execFileAsync(process.execPath, ['--check', file]);
    });
  }
});

describe('live HTTP checks', async () => {
  let serverUp = false;
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    test('server reachable (skipped — no server at BASE_URL)', { skip: true }, () => {});
    // eslint-disable-next-line no-console
    console.log(
      `\n[live checks SKIPPED] No server answered at ${BASE_URL}.\n` +
        'Start one first: set DATABASE_URL in .env, run migrations + seed, then `npm run dev`.\n'
    );
    return;
  }

  const get = (p, opts = {}) => fetch(`${BASE_URL}${p}`, opts);
  const post = (p, body) =>
    fetch(`${BASE_URL}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  test('GET /api/health → 200 { status: ok }', async () => {
    const res = await get('/api/health');
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'ok');
  });

  test('GET /api/stats → 200 with the four stat keys', async () => {
    const res = await get('/api/stats');
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    for (const key of ['peopleSupported', 'volunteers', 'statesReached', 'corePrograms']) {
      assert.strictEqual(typeof json.data[key], 'number', `missing ${key}`);
    }
  });

  test('GET /api/programs → 200 array', async () => {
    const res = await get('/api/programs');
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  test('GET /api/auth/me without a session → 401', async () => {
    const res = await get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  test('GET /api/admin/overview without a session → 401', async () => {
    const res = await get('/api/admin/overview');
    assert.strictEqual(res.status, 401);
  });

  test('POST /api/contact with invalid body → 400', async () => {
    const res = await post('/api/contact', { name: 'Test' });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });

  test('POST /api/donations/checkout with amount 0 → 400', async () => {
    const res = await post('/api/donations/checkout', { amount: 0 });
    assert.strictEqual(res.status, 400);
  });

  test('POST /api/donations/checkout valid amount → 200 { url } or 503 { setupRequired }', async () => {
    const res = await post('/api/donations/checkout', { amount: 25 });
    const json = await res.json();
    if (res.status === 200) {
      assert.ok(json.data.url, 'expected a Checkout URL');
    } else {
      assert.strictEqual(res.status, 503);
      assert.strictEqual(json.setupRequired, true);
    }
  });

  test('POST /api/auth/login with bad body → 400', async () => {
    const res = await post('/api/auth/login', { email: 'not-an-email' });
    assert.strictEqual(res.status, 400);
  });

  test('unknown /api route → 404', async () => {
    const res = await get('/api/no-such-route');
    assert.strictEqual(res.status, 404);
  });
});
