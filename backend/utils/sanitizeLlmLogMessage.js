function sanitizeLlmLogMessage(message) {
  return String(message || '')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .slice(0, 800);
}

module.exports = { sanitizeLlmLogMessage };
