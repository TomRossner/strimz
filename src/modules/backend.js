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

  // Always log stdout to help debug startup issues
  backendProcess.stdout.on("data", (data) => {
    const output = data.toString().trim();
    console.log(`[Backend STDOUT]: ${output}`);
    log.info(`[Backend STDOUT]: ${output}`);
  });

  // Log process exit to help debug
  backendProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      log.error(`Backend process exited with non-zero code ${code} and signal ${signal}`);
      console.error(`Backend process exited with non-zero code ${code} and signal ${signal}`);
    } else {
      log.warn(`Backend process exited with code ${code} and signal ${signal}`);
      console.warn(`Backend process exited with code ${code} and signal ${signal}`);
    }
  });
  
  log.info(`Backend process started (PID: ${backendProcess.pid}, path: ${backendRelativePath})`);
  
  return backendProcess;
}

export function waitForBackendReady(backendProcess) {
  // In dev mode, allow more time for compilation/startup
  // In prod, allow significantly more time as packaged apps can be much slower to start
  // Increased timeout to handle slower systems and heavy dependency loading
  const retries = isDev ? 120 : 360; // 60 seconds in dev, 180 seconds (3 min) in prod
  const interval = 500;
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const startTime = Date.now();
    
    const check = () => {
      attempts++;
      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Check if backend process has crashed/exited
      if (backendProcess && backendProcess.exitCode !== null) {
        const errorMsg = `Backend process exited with code ${backendProcess.exitCode} before becoming ready (${elapsedSeconds}s elapsed). Check backend logs for errors.`;
        log.error(errorMsg);
        return reject(new Error(errorMsg));
      }
      
      // Log progress every 10 attempts (5 seconds) to track startup
      if (attempts % 10 === 0) {
        log.info(`Waiting for backend... (attempt ${attempts}/${retries}, ${elapsedSeconds}s elapsed)`);
      }
      
      const req = http.get(`${API_URL}/ping`, {
        timeout: 3000 // 3 second timeout per request to avoid hanging
      }, (res) => {
        if (res.statusCode === 200) {
          const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
          log.info(`Backend ready after ${attempts} attempts (${totalSeconds} seconds)`);
          resolve();
        } else {
          retry();
        }
        res.resume(); // Consume response data to free up memory
      }).on('error', (err) => {
        // Only log connection errors occasionally to avoid spam
        if (attempts % 20 === 0) {
          log.debug(`Backend ping error (attempt ${attempts}): ${err.message}`);
        }
        retry();
      }).on('timeout', () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (attempts >= retries) {
        const timeoutSeconds = (retries * interval) / 1000;
        const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        const processStatus = backendProcess ? (backendProcess.exitCode !== null ? ` (process exited with code ${backendProcess.exitCode})` : ' (process still running)') : '';
        log.error(`Backend not ready after ${timeoutSeconds} seconds timeout (${attempts} attempts, ${totalSeconds}s elapsed)${processStatus}. Check backend logs for startup errors.`);
        return reject(new Error(`Backend not ready after ${timeoutSeconds} seconds (${attempts} attempts).`));
      }
      setTimeout(check, interval);
    };

    // Small initial delay before first check
    log.info(`Starting backend readiness check (timeout: ${retries * interval / 1000}s)`);
    setTimeout(check, interval);
  });
}