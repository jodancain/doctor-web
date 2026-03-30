import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { logger } from './server/logger';
import authRoutes from './server/routes/auth';
import patientRoutes from './server/routes/patients';
import educationRoutes from './server/routes/education';
import miniprogramRoutes from './server/routes/miniprogram';
import uploadRoutes from './server/routes/upload';
import aiRoutes from './server/routes/ai';
import openApiRoutes from './server/routes/open-api';
import questionnairesRoutes from './server/routes/questionnaires';
import projectsRoutes from './server/routes/projects';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // CORS — 允许白名单来源跨域访问
  const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 静态文件：上传图片
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // 健康检查（Docker / 负载均衡器使用）
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/education', educationRoutes);
  app.use('/api/miniprogram', miniprogramRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/open/v1', openApiRoutes);
  app.use('/api/questionnaires', questionnairesRoutes);
  app.use('/api/projects', projectsRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
