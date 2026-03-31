import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db, _ } from '../db';
import { logger } from '../logger';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // Limit each IP to 5 login requests per windowMs
//   message: { error: 'Too many login attempts, please try again later.' },
// });

router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const result = await db.collection('users').where({ username }).limit(1).get();
    const user = result.data[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied: Only doctors can login to this portal' });
    }

    // Password verification
    // NOTE: If the database contains plaintext passwords, you MUST migrate them.
    // Migration strategy:
    // 1. Check if the password starts with '$2b$' (bcrypt prefix).
    // 2. If not, compare plaintext. If it matches, hash it and update the DB immediately.
    // 3. For security, it's better to run a one-time script to hash all passwords.
    let isMatch = false;
    const dbPassword = String(user.password); // Convert to string in case it's stored as a number

    if (dbPassword.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, dbPassword);
    } else {
      // Fallback for plaintext (WARNING: MIGRATION NEEDED)
      logger.warn(`Plaintext password detected for user ${username}. Please migrate to bcrypt.`);
      isMatch = password === dbPassword;
      
      if (isMatch) {
        // Auto-migrate on successful login
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection('users').doc(user._id).update({
          password: hashedPassword
        });
        logger.info(`Migrated password for user ${username} to bcrypt.`);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const payload = {
      id: user._id,
      username: user.username,
      nickName: user.nickName,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1d' });

    // Cookie 安全属性需要和部署协议匹配：
    // - 不是 HTTPS 时，secure=true 的 cookie 会被浏览器拒绝写入，后续接口就会拿不到 token。
    // - HTTPS/跨站场景下，为了让浏览器带 cookie，需要 sameSite=None + secure=true。
    const xForwardedProto = String(req.headers['x-forwarded-proto'] || '');
    const cookieSecureEnv = process.env.COOKIE_SECURE;
    const isSecure =
      cookieSecureEnv === undefined
        ? req.secure || xForwardedProto.includes('https')
        : cookieSecureEnv === 'true' || cookieSecureEnv === '1';
    const sameSite = (isSecure ? 'none' : 'lax') as const;

    // Set httpOnly cookie
    // Why httpOnly? It prevents client-side scripts (XSS) from accessing the token.
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.json(payload);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ error }, 'Login error');
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  const xForwardedProto = String(req.headers['x-forwarded-proto'] || '');
  const cookieSecureEnv = process.env.COOKIE_SECURE;
  const isSecure =
    cookieSecureEnv === undefined
      ? req.secure || xForwardedProto.includes('https')
      : cookieSecureEnv === 'true' || cookieSecureEnv === '1';
  const sameSite = (isSecure ? 'none' : 'lax') as const;

  res.clearCookie('token', {
    httpOnly: true,
    secure: isSecure,
    sameSite,
  });
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.collection('users').doc(req.user!.id).get();
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.data[0];
    
    // Parse org string if it exists to get hospital and department
    let hospital = user.hospital;
    let department = user.department;
    
    if (user.org && (!hospital || !department)) {
      const parts = user.org.split(' ');
      if (!hospital && parts.length > 0) hospital = parts[0];
      if (!department && parts.length > 1) department = parts[1];
    }

    // Remove sensitive info and map fields
    const { password, name, ...safeUser } = user;
    res.json({
      ...safeUser,
      nickName: user.nickName || name || user.username,
      hospital: hospital || '',
      department: department || '',
    });
  } catch (error) {
    logger.error({ error }, 'Get me error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

const updateProfileSchema = z.object({
  nickName: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  licenseNo: z.string().optional(),
  hospital: z.string().optional(),
  avatar: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updateData = updateProfileSchema.parse(req.body);

    // Handle password change
    if (updateData.currentPassword && updateData.newPassword) {
      const userResult = await db.collection('users').doc(req.user!.id).get();
      const user = userResult.data[0];
      const dbPassword = String(user.password);

      let passwordMatch = false;
      if (dbPassword.startsWith('$2b$')) {
        passwordMatch = await bcrypt.compare(updateData.currentPassword, dbPassword);
      } else {
        passwordMatch = updateData.currentPassword === dbPassword;
      }

      if (!passwordMatch) {
        return res.status(400).json({ error: '当前密码不正确' });
      }

      const hashedPassword = await bcrypt.hash(updateData.newPassword, 10);
      await db.collection('users').doc(req.user!.id).update({
        password: hashedPassword,
        updatedAt: new Date(),
      });
      logger.info(`Password changed for user ${req.user!.username}`);
      return res.json({ success: true });
    }

    // Remove password fields from profile update
    delete updateData.currentPassword;
    delete updateData.newPassword;

    // Also update the org string if hospital or department changes
    let orgUpdate = {};
    if (updateData.hospital || updateData.department) {
      const userResult = await db.collection('users').doc(req.user!.id).get();
      const user = userResult.data[0];

      const currentHospital = updateData.hospital || user.hospital || (user.org ? user.org.split(' ')[0] : '');
      const currentDept = updateData.department || user.department || (user.org ? user.org.split(' ')[1] : '');

      orgUpdate = {
        org: `${currentHospital} ${currentDept}`.trim()
      };
    }

    await db.collection('users').doc(req.user!.id).update({
      ...updateData,
      ...orgUpdate,
      ...(updateData.nickName ? { name: updateData.nickName } : {}),
      updatedAt: new Date()
    });
    return res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ error }, 'Update profile error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
