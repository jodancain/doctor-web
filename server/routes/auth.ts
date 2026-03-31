import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { logger } from '../logger';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.role !== 'doctor' && user.role !== 'user') {
      return res.status(403).json({ error: 'Access denied: Invalid user role' });
    }

    // Password verification with bcrypt migration support
    let isMatch = false;
    const dbPassword = String(user.password);

    if (dbPassword.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, dbPassword);
    } else {
      logger.warn(`Plaintext password detected for user ${username}. Please migrate to bcrypt.`);
      isMatch = password === dbPassword;

      if (isMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
        logger.info(`Migrated password for user ${username} to bcrypt.`);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      nickName: user.nickName,
      role: user.role,
      _openid: user.openid || undefined,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1d' });

    const xForwardedProto = String(req.headers['x-forwarded-proto'] || '');
    const cookieSecureEnv = process.env.COOKIE_SECURE;
    const isSecure =
      cookieSecureEnv === undefined
        ? req.secure || xForwardedProto.includes('https')
        : cookieSecureEnv === 'true' || cookieSecureEnv === '1';
    const sameSite = (isSecure ? 'none' : 'lax') as const;

    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite,
      maxAge: 24 * 60 * 60 * 1000,
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

  res.clearCookie('token', { httpOnly: true, secure: isSecure, sameSite });
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let hospital = user.hospital;
    let department = user.department;

    if (user.org && (!hospital || !department)) {
      const parts = user.org.split(' ');
      if (!hospital && parts.length > 0) hospital = parts[0];
      if (!department && parts.length > 1) department = parts[1];
    }

    const { password, ...safeUser } = user;
    return res.json({
      ...safeUser,
      nickName: user.nickName || user.name || user.username,
      hospital: hospital || '',
      department: department || '',
    });
  } catch (error) {
    logger.error({ error }, 'Get me error');
    return res.status(500).json({ error: 'Internal server error' });
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
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

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
      await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashedPassword } });
      logger.info(`Password changed for user ${req.user!.username}`);
      return res.json({ success: true });
    }

    // Profile update
    const { currentPassword, newPassword, ...profileData } = updateData;

    let orgUpdate: string | undefined;
    if (profileData.hospital || profileData.department) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (user) {
        const currentHospital = profileData.hospital || user.hospital || (user.org ? user.org.split(' ')[0] : '');
        const currentDept = profileData.department || user.department || (user.org ? user.org.split(' ')[1] : '');
        orgUpdate = `${currentHospital} ${currentDept}`.trim();
      }
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...profileData,
        ...(orgUpdate ? { org: orgUpdate } : {}),
        ...(profileData.nickName ? { name: profileData.nickName } : {}),
      },
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
