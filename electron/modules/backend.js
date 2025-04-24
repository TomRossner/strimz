import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import log from 'electron-log';
import { app } from 'electron';

const isDev = !app.isPackaged;

const nodeBinary = isDev
  ? process.execPath
  : path.join(process.resourcesPath, 'node', 'node.exe');

const backendRelativePath = isDev ? './strimz-backend/dist/index.js' : path.join(process.resourcesPath, 'backend', 'index.js');

export function startBackend() {
  const backendProcess = spawn(
    nodeBinary,
    [backendRelativePath],
    {
      shell: false,
      stdio: 'pipe',
      detached: false,
      env: {
        ...process.env,
        IS_BACKEND_PROCESS: 'true',
        PORT: '3003',
      },
    }
  );

  backendProcess.on('error', (err) => {
    log.error("Backend Process Error:", err);
    console.error("Backend Process Error:", err);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`[Backend STDERR]: ${data.toString().trim()}`);
    log.error(`[Backend STDERR]: ${data.toString().trim()}`);
  });

  if (isDev) {
    backendProcess.stdout.on("data", (data) => {
      console.log(`[Backend STDOUT]: ${data.toString().trim()}`);
      log.info(`[Backend STDOUT]: ${data.toString().trim()}`);
    });
  }

  return backendProcess;
}

export function waitForBackendReady(retries = 20, interval = 500) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get('http://localhost:3003/api/ping', res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (--retries === 0) return reject(new Error('Backend not ready after multiple retries.'));
      setTimeout(check, interval);
    };

    check();
  });
}