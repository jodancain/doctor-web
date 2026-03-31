import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    nickName: string;
    role: string;
    _openid?: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ error }, 'JWT Verification failed');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireDoctor = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ error: 'Forbidden: Requires doctor role' });
  }
  next();
};

export const requirePatient = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'user') {
    return res.status(403).json({ error: 'Forbidden: Requires patient role' });
  }
  next();
};
