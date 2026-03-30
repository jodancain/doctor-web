import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';

const router = Router();

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// JWT 鉴权中间件（复用小程序 token）
function authMiniprogram(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    const decoded = jwt.verify(token, jwtSecret) as any;
    req.openid = decoded.openid;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * POST /api/upload/image
 * 小程序聊天图片上传，返回可访问的 HTTP URL
 */
router.post('/image', authMiniprogram, upload.single('file'), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 构造可访问的公网 URL（生产环境通过反向代理暴露 /uploads 静态目录）
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${baseUrl}/uploads/chat/${req.file.filename}`;

    logger.info({ openid: req.openid, filename: req.file.filename }, 'Image uploaded');
    res.json({ url: fileUrl });
  } catch (err: any) {
    logger.error({ err }, 'Image upload error');
    res.status(500).json({ error: err.message });
  }
});

export default router;
