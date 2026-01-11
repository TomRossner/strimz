import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import log from 'electron-log';
import { app } from 'electron';
import { API_URL, BACKEND_PORT } from '../constants.js';

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
        PORT: BACKEND_PORT,
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

export function waitForBackendReady() {
  // In dev mode, allow more time for compilation/startup
  const retries = isDev ? 120 : 60; // 60 seconds in dev, 30 seconds in prod
  const interval = 500;
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      http.get(`${API_URL}/ping`, res => {
        if (res.statusCode === 200) {
          log.info(`Backend ready after ${attempts} attempts`);
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (attempts >= retries) {
        const timeoutSeconds = (retries * interval) / 1000;
        return reject(new Error(`Backend not ready after ${timeoutSeconds} seconds (${attempts} attempts).`));
      }
      setTimeout(check, interval);
    };

    // Small initial delay before first check
    setTimeout(check, interval);
  });
}