const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

function mergeCookieJar(jar, setCookieLines) {
  const map = new Map();
  if (jar) {
    jar.split(';').forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const eq = trimmed.indexOf('=');
      if (eq > 0) map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    });
  }
  for (const line of setCookieLines) {
    const pair = line.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) map.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

class ScenarioClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookieJar = '';
    this.bankId = null;
  }

  async request(method, pathname, { body, headers = {}, formData, json = true } = {}) {
    const url = `${this.baseUrl}${pathname}`;
    const reqHeaders = { ...headers };
    if (this.cookieJar) reqHeaders.Cookie = this.cookieJar;
    if (this.bankId) reqHeaders['X-Bank-Id'] = this.bankId;

    let payload = formData || body;
    if (body && json && !formData) {
      reqHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: payload,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    this.cookieJar = mergeCookieJar(this.cookieJar, extractSetCookies(res.headers));

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else if (contentType.includes('application/zip') || contentType.includes('octet-stream')) {
      data = Buffer.from(await res.arrayBuffer());
    } else {
      data = await res.text();
    }

    return { status: res.status, data, headers: res.headers };
  }

  async register(username, password, email) {
    return this.request('POST', '/api/auth/register', {
      body: { username, password, email },
    });
  }

  async login(username, password) {
    const res = await this.request('POST', '/api/auth/login', {
      body: { username, password },
    });
    return res;
  }

  async importLatexFile(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'text/plain',
    });
    const url = `${this.baseUrl}/api/questions/import/latex`;
    const headers = {
      ...form.getHeaders(),
    };
    if (this.cookieJar) headers.Cookie = this.cookieJar;
    if (this.bankId) headers['X-Bank-Id'] = this.bankId;
    const res = await axios.post(url, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const lines = Array.isArray(setCookie) ? setCookie : [setCookie];
      this.cookieJar = mergeCookieJar(this.cookieJar, lines);
    }
    return { status: res.status, data: res.data };
  }

  async loadDefaultBank() {
    const { status, data } = await this.request('GET', '/api/banks/mine');
    const banks = data?.banks ?? (Array.isArray(data) ? data : []);
    if (status !== 200 || !banks.length) {
      throw new Error('无法获取个人题库');
    }
    const personal = banks.find((b) => b.isPersonalDefault) || banks[0];
    this.bankId = String(personal._id);
    return personal;
  }
}

async function startServer(mongoUri, port) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        MONGODB_URI: mongoUri,
        SESSION_SECRET: 'scenario-test-secret',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const deadline = Date.now() + 30000;
    const tick = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.ok) {
          resolve(child);
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() > deadline) {
        child.kill();
        reject(new Error(`Server failed to start: ${stderr}`));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

module.exports = {
  ScenarioClient,
  startServer,
};
