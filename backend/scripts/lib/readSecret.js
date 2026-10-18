/**
 * Read a secret from env or stdin without printing the value to stdout.
 * @param {{ envVar?: string }} [opts]
 * @returns {Promise<string>}
 */
async function readNewPassword(opts = {}) {
  const envVar = opts.envVar || 'RESET_PASSWORD';
  const fromEnv = process.env[envVar];
  if (fromEnv != null && String(fromEnv).length > 0) {
    return String(fromEnv);
  }

  if (process.stdin.isTTY) {
    return readHiddenFromTty();
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

/**
 * @returns {Promise<string>}
 */
function readHiddenFromTty() {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stderr = process.stderr;
    if (!stdin.isTTY) {
      reject(new Error('TTY required for hidden password prompt'));
      return;
    }
    stderr.write('New password: ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let password = '';

    const onData = (char) => {
      if (char === '\u0003') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        reject(new Error('Cancelled'));
        return;
      }
      if (char === '\r' || char === '\n' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        stderr.write('\n');
        resolve(password);
        return;
      }
      if (char === '\u007f' || char === '\b') {
        password = password.slice(0, -1);
        return;
      }
      password += char;
    };

    stdin.on('data', onData);
  });
}

module.exports = { readNewPassword, readHiddenFromTty };
