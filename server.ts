import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { logger } from './server/logger';
import authRoutes from './server/routes/auth';
import patientRoutes from './server/routes/patients';
import educationRoutes from './server/routes/education';
import questionnaireRoutes from './server/routes/questionnaires';
import messageRoutes from './server/routes/messages';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/education', educationRoutes);
  app.use('/api/questionnaires', questionnaireRoutes);
  app.use('/api/messages', messageRoutes);

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
