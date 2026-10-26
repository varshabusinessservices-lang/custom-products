/**
 * Full-Stack Entry Point: Node.js 22 + Express + Vite Middleware
 * Commercial Indian Personalised Products E-Commerce Platform
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes/api';
import { rateLimiterMiddleware, securityHeadersMiddleware } from './server/security';

import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  // Body Parsing & Max Payload Size
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security Headers & Rate Limiting
  app.use(securityHeadersMiddleware);
  app.use('/api/', rateLimiterMiddleware);

  // Restrictive CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.run.app') || origin.includes('localhost')) {
          return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Guest-Token'],
    })
  );

  // Mount Versioned REST API
  app.use('/api/v1', apiRouter);

  // Frontend Integration: Vite Middleware in Dev, Static in Prod
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Personalised Store API] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[API v1 Health] Check http://0.0.0.0:${PORT}/api/v1/health`);
    console.log(`[OpenAPI 3.1 Spec] Available at http://0.0.0.0:${PORT}/api/v1/openapi.json`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Fatal startup error:', err);
  process.exit(1);
});
