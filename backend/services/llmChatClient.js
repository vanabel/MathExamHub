/**
 * OpenAI-compatible chat completions (OpenAI / SiliconFlow / DeepSeek etc.)
 * @param {object} opts
 * @param {string} opts.baseUrl e.g. https://api.openai.com/v1
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {number} [opts.timeoutMs]
 */
async function chatCompletionJson(opts) {
  const base = String(opts.baseUrl || '').replace(/\/$/, '');
  const url = `${base}/chat/completions`;
  const timeoutMs = opts.timeoutMs ?? 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM empty response');
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chatCompletionJson };
