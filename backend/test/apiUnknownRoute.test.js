const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const axios = require('axios');

describe('unknown /api routes', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use('/api', (req, res) => {
      res.status(404).json({
        error: 'API 路由不存在',
        method: req.method,
        path: req.originalUrl,
      });
    });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns JSON 404 with message', async () => {
    const res = await axios.get(`${baseUrl}/api/no-such-route`, { validateStatus: () => true });
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'API 路由不存在');
    assert.ok(res.data.path.includes('/api/no-such-route'));
  });
});
