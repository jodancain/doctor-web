import { Router, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireDoctor);

// GET /api/dashboard/stats
router.get('/dashboard/stats', async (req: AuthRequest, res: Response) => {
  try {
    const totalPatients = await prisma.user.count({ where: { role: 'user' } });
    res.json({
      totalPatients,
      criticalPatients: 0,
      riskPatients: 0,
      stablePatients: totalPatients,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching dashboard stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const q = req.query.q as string;

    const where: any = { role: 'user' };
    if (q) {
      where.OR = [
        { nickName: { contains: q } },
        { username: { contains: q } },
        { name: { contains: q } },
      ];
    }

    const [total, patients] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        select: {
          id: true, username: true, nickName: true, name: true, role: true,
          openid: true, gender: true, age: true, diagnosis: true, status: true,
          targetUricAcid: true, medication: true, lastVisit: true, avatar: true,
          hospital: true, department: true, createdAt: true,
        },
      }),
    ]);

    // Fetch summary for each patient
    const patientsWithSummary = await Promise.all(
      patients.map(async (patient) => {
        try {
          if (!patient.openid) return { ...patient, _openid: patient.openid };

          const sevenDaysAgo = BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000);

          const [latestUa, recentAttacks] = await Promise.all([
            prisma.uaRecord.findFirst({
              where: { openid: patient.openid },
              orderBy: { timestamp: 'desc' },
            }),
            prisma.attackRecord.count({
              where: { openid: patient.openid, timestamp: { gte: sevenDaysAgo } },
            }),
          ]);

          return {
            ...patient,
            _openid: patient.openid,
            lastUricAcid: latestUa?.value || null,
            recentAttacks,
            status: recentAttacks > 0 ? 'Critical' : ((latestUa?.value || 0) > 360 ? 'Risk' : 'Stable'),
          };
        } catch {
          return { ...patient, _openid: patient.openid };
        }
      })
    );

    logger.info({ count: total, itemsCount: patients.length }, 'Fetched patients');
    res.json({ items: patientsWithSummary, total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching patients');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientOpenid
router.get('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const patient = await prisma.user.findFirst({ where: { openid: req.params.patientOpenid } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const { password, ...safePatient } = patient;
    res.json({ ...safePatient, _openid: patient.openid });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/patients/:patientOpenid
router.put('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const { nickName, age, gender, diagnosis, status, targetUricAcid, medication } = req.body;
    const result = await prisma.user.updateMany({
      where: { openid: req.params.patientOpenid },
      data: {
        ...(nickName !== undefined && { nickName }),
        ...(age !== undefined && { age }),
        ...(gender !== undefined && { gender }),
        ...(diagnosis !== undefined && { diagnosis }),
        ...(status !== undefined && { status }),
        ...(targetUricAcid !== undefined && { targetUricAcid }),
        ...(medication !== undefined && { medication }),
      },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ success: true, updated: result.count });
  } catch (error) {
    logger.error({ error }, 'Error updating patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const openid = data._openid || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const patient = await prisma.user.create({
      data: {
        username: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        password: '',
        nickName: data.nickName,
        name: data.nickName,
        role: 'user',
        openid,
        age: data.age,
        gender: data.gender,
        diagnosis: data.diagnosis,
        status: data.status,
        targetUricAcid: data.targetUricAcid,
        medication: data.medication,
      },
    });
    res.status(201).json({ success: true, id: patient.id, _openid: openid });
  } catch (error) {
    logger.error({ error }, 'Error creating patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/patients/:patientOpenid
router.delete('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.params.patientOpenid;
    const result = await prisma.user.deleteMany({ where: { openid, role: 'user' } });
    if (result.count === 0) return res.status(404).json({ error: 'Patient not found' });

    // Clean up related records
    await Promise.all([
      prisma.uaRecord.deleteMany({ where: { openid } }),
      prisma.attackRecord.deleteMany({ where: { openid } }),
      prisma.waterRecord.deleteMany({ where: { openid } }),
      prisma.exerciseRecord.deleteMany({ where: { openid } }),
      prisma.medicationReminder.deleteMany({ where: { openid } }),
      prisma.dietRecord.deleteMany({ where: { openid } }),
    ]);
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    logger.error({ error }, 'Error deleting patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientOpenid/records
router.get('/:patientOpenid/records', async (req: AuthRequest, res: Response) => {
  try {
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const openid = req.params.patientOpenid;

    const modelMap: Record<string, any> = {
      ua: prisma.uaRecord,
      attack: prisma.attackRecord,
      water: prisma.waterRecord,
      exercise: prisma.exerciseRecord,
      medication: prisma.medicationReminder,
      diet: prisma.dietRecord,
    };

    const model = modelMap[type];
    if (!model) return res.status(400).json({ error: 'Invalid record type' });

    const items = await model.findMany({
      where: { openid },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
    });

    res.json({ items, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient records');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientOpenid/summary
router.get('/:patientOpenid/summary', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.params.patientOpenid;
    const sevenDaysAgo = BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [latestUa, recentAttacks, recentWater, recentExercise, recentMeds] = await Promise.all([
      prisma.uaRecord.findFirst({ where: { openid }, orderBy: { timestamp: 'desc' } }),
      prisma.attackRecord.count({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
      prisma.waterRecord.findMany({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
      prisma.exerciseRecord.findMany({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
      prisma.medicationReminder.count({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
    ]);

    res.json({
      latestUa: latestUa?.value || null,
      recentAttacks,
      recentWaterTotal: recentWater.reduce((sum, r) => sum + (r.amount || 0), 0),
      recentExerciseTotal: recentExercise.reduce((sum, r) => sum + (r.duration || 0), 0),
      recentMedsCount: recentMeds,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
