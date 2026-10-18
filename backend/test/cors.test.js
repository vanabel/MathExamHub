const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const axios = require('axios');
const { parseCorsOrigins } = require('../config/corsOrigins');
const { createCorsPolicyMiddleware } = require('../middleware/corsPolicy');

describe('parseCorsOrigins', () => {
  it('defaults include production and dev origins', () => {
    const prev = process.env.CORS_ORIGINS;
    delete process.env.CORS_ORIGINS;
    const origins = parseCorsOrigins();
    if (prev !== undefined) process.env.CORS_ORIGINS = prev;
    assert.ok(origins.includes('https://exam.vanabel.cn'));
    assert.ok(origins.includes('http://localhost:8080'));
    assert.ok(origins.includes('http://127.0.0.1:3000'));
  });

  it('reads comma-separated override from env', () => {
    assert.deepEqual(parseCorsOrigins('https://a.example,https://b.example'), [
      'https://a.example',
      'https://b.example',
    ]);
  });
});

describe('CORS policy middleware', () => {
  let server;
  let baseUrl;

  before(async () => {
    const allowed = parseCorsOrigins('https://exam.vanabel.cn,http://localhost:3000');
    const app = express();
    app.use(...createCorsPolicyMiddleware(allowed));
    app.post('/api/auth/login', (req, res) => {
      res.status(400).json({ error: '用户名或密码错误' });
    });
    app.get('/api/health', (req, res) => {
      res.json({ ok: true });
    });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('allows production origin to reach login handler (400 on bad body)', async () => {
    const res = await axios.post(
      `${baseUrl}/api/auth/login`,
      {},
      {
        headers: { Origin: 'https://exam.vanabel.cn' },
        validateStatus: () => true,
      },
    );
    assert.equal(res.status, 400);
    assert.equal(res.headers['access-control-allow-origin'], 'https://exam.vanabel.cn');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('refuses unknown origin with 403 (not 500)', async () => {
    const res = await axios.post(
      `${baseUrl}/api/auth/login`,
      {},
      {
        headers: { Origin: 'https://evil.example' },
        validateStatus: () => true,
      },
    );
    assert.equal(res.status, 403);
    assert.equal(res.data.error, 'CORS origin not allowed');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('allows requests without Origin header', async () => {
    const res = await axios.get(`${baseUrl}/api/health`, { validateStatus: () => true });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
  });

  it('honors env-style override list', async () => {
    const res = await axios.get(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:3000' },
      validateStatus: () => true,
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
  });
});
