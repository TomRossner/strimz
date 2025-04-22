const http = require('http');
const { spawn } = require('child_process');
const log = require('electron-log');

function startBackend(nodeBinary, backendRelativePath, isDev) {
  const backendProcess = spawn(nodeBinary, [backendRelativePath], {
    shell: false,
    stdio: 'pipe',
    detached: false,
    env: {
      ...process.env,
      IS_BACKEND_PROCESS: 'true',
      PORT: '3003',
    },
  });

  backendProcess.on('error', (err) => {
    log.error("Backend Process Error:", err);
  });

  backendProcess.stderr.on("data", (data) => {
    log.error(`[Backend STDERR]: ${data.toString().trim()}`);
  });

  if (isDev) {
    backendProcess.stdout.on("data", (data) => {
      log.info(`[Backend STDOUT]: ${data.toString().trim()}`);
    });
  }

  return backendProcess;
}

function waitForBackendReady(retries = 20, interval = 500) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get('http://localhost:3003/api/ping', res => {
        res.statusCode === 200 ? resolve() : retry();
      }).on('error', retry);
    };
    const retry = () => (--retries === 0) ? reject(new Error('Backend not ready')) : setTimeout(check, interval);
    check();
  });
}

module.exports = { startBackend, waitForBackendReady };
