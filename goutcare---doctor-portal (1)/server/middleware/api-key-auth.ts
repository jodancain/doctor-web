/**
 * API Key 认证中间件
 *
 * Open API 使用 Bearer token 认证：Authorization: Bearer <API_KEY>
 * API Key 存储在 MongoDB apiKeys 集合中。
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { logger } from '../logger';

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export function requireApiKey(...requiredPermissions: string[]) {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    // 检查功能开关
    if (process.env.OPEN_API_ENABLED !== 'true') {
      return res.status(404).json({ error: 'Open API is not enabled' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(401).json({ error: 'API key is required' });
    }

    try {
      // 查找 API Key（简单模式：明文匹配。生产环境建议用 bcrypt 哈希）
      const { data } = await db.collection('apiKeys')
        .where({ key: token, active: true })
        .limit(1)
        .get();

      if (data.length === 0) {
        return res.status(401).json({ error: 'Invalid or inactive API key' });
      }

      const apiKey = data[0];

      // 检查权限
      if (requiredPermissions.length > 0) {
        const hasAll = requiredPermissions.every(p => (apiKey.permissions || []).includes(p));
        if (!hasAll) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: requiredPermissions,
            granted: apiKey.permissions || [],
          });
        }
      }

      // 更新最后使用时间
      db.collection('apiKeys').where({ _id: apiKey._id }).update({
        lastUsedAt: new Date().toISOString(),
      }).catch(() => {}); // fire-and-forget

      // 记录审计日志
      db.collection('apiAuditLog').add({
        apiKeyId: apiKey._id,
        apiKeyName: apiKey.name,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      req.apiKey = {
        id: apiKey._id,
        name: apiKey.name,
        permissions: apiKey.permissions || [],
      };

      next();
    } catch (err) {
      logger.error({ err }, 'API key auth error');
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
}
