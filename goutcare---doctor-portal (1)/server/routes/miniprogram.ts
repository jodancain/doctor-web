import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db, _ } from '../db';
import { logger } from '../logger';
// Need to import handler logic, wait, handler logic needs context.
import * as handlerModule from '../services/miniprogram/handler.cjs';
const { handleRequest } = handlerModule as any;

const router = Router();

// Endpoint for wx.login code exchange
router.post('/login-wx', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });

    const appId = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appId || !secret) {
      // For development without WeChat API, you could just mock an openid, 
      // but in production, we MUST call WeChat API.
      logger.warn('WX_APPID or WX_SECRET is missing. Using mock openid for development.');
      // Mock flow if no secrets are provided (useful for local dev):
      const mockOpenid = 'mock_openid_' + code;
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
      const token = jwt.sign({ openid: mockOpenid, appid: appId }, jwtSecret, { expiresIn: '7d' });
      return res.json({ token, openid: mockOpenid });
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      return res.status(400).json({ error: data.errmsg });
    }

    const { openid, unionid } = data;
    
    // Create JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    const token = jwt.sign({ openid, unionid, appid: appId }, jwtSecret, { expiresIn: '7d' });
    
    res.json({ token, openid });

  } catch (err: any) {
    logger.error({ err }, 'wx login error');
    res.status(500).json({ error: err.message });
  }
});

// Main router for all other actions
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const context = {
      ...req.body, // contains action, and other data
      openid: decoded.openid,
      appid: decoded.appid,
      unionid: decoded.unionid,
      db,
      _: db.command
    };

    const result = await handleRequest(context);
    
    res.json({ result });

  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error({ err }, 'Miniprogram action error');
    res.status(500).json({ error: err.message });
  }
});

export default router;
