import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let server = null;
let serverPort = null;

// Simple MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export function startStaticServer() {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve(serverPort);
      return;
    }

    const distPath = path.resolve(__dirname, '../../strimz-client/dist');
    
    // Find an available port starting from 5174
    const tryStartServer = (port) => {
      server = http.createServer((req, res) => {
        // Decode URL to handle special characters
        let decodedUrl;
        try {
          decodedUrl = decodeURIComponent(req.url);
        } catch (e) {
          decodedUrl = req.url;
        }
        let filePath = path.join(distPath, decodedUrl === '/' ? 'index.html' : decodedUrl);
        
        // Security: ensure file is within dist directory
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(distPath))) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        // Check if file exists
        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            // If not a file, try index.html for SPA routing
            if (req.url !== '/index.html') {
              filePath = path.join(distPath, 'index.html');
              fs.stat(filePath, (err2, stats2) => {
                if (err2 || !stats2.isFile()) {
                  res.writeHead(404);
                  res.end('Not Found');
                  return;
                }
                serveFile(filePath, res);
              });
            } else {
              res.writeHead(404);
              res.end('Not Found');
            }
          } else {
            serveFile(filePath, res);
          }
        });
      });

      function serveFile(filePath, res) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
          }
          
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
          });
          res.end(data);
        });
      }

      server.listen(port, '127.0.0.1', () => {
        serverPort = port;
        resolve(port);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Try next port
          tryStartServer(port + 1);
        } else {
          reject(err);
        }
      });
    };

    tryStartServer(5174);
  });
}

export function stopStaticServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        serverPort = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getServerUrl() {
  return serverPort ? `http://127.0.0.1:${serverPort}` : null;
}
