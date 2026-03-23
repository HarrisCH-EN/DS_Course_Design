import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// C++ backend API proxy - must be BEFORE express.json() to preserve raw body stream
const API_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;

// Manual proxy for API requests (registered before body parser)
app.use('/api', (req, res) => {
  const targetPath = `/api${req.url}`;
  
  const headers: Record<string, string> = {
    host: `localhost:${API_PORT}`
  };
  // Forward content headers
  if (req.headers['content-type']) {
    headers['content-type'] = req.headers['content-type'] as string;
  }
  if (req.headers['content-length']) {
    headers['content-length'] = req.headers['content-length'] as string;
  }
  
  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: targetPath,
    method: req.method,
    headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Backend service unavailable' });
  });
  
  req.pipe(proxyReq);
});

// Body parser for non-API routes only
app.use(express.json());

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
    console.log(`API proxy -> ${API_URL}`);
  });
}

startServer();