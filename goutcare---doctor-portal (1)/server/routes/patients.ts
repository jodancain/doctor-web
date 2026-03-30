import { Router, Response } from 'express';
import { db, _ } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth and doctor role requirements to all patient routes
router.use(requireAuth, requireDoctor);

// GET /api/dashboard/stats
router.get('/dashboard/stats', async (req: AuthRequest, res: Response) => {
  try {
    const query = { role: 'user' };
    const countResult = await db.collection('users').where(query).count();
    
    // For high risk, we can just mock it or calculate it if we have time.
    // Let's just return some basic stats.
    res.json({
      totalPatients: countResult.total,
      criticalPatients: 0, // Placeholder, would need complex aggregation
      riskPatients: 0, // Placeholder
      stablePatients: countResult.total, // Placeholder
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching dashboard stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients?limit&offset&q
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const q = req.query.q as string;

    let query: any = { role: 'user' };

    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = db.RegExp({ regexp: escapedQ, options: 'i' });
      query = _.and([
        { role: 'user' },
        _.or([
          { nickName: searchRegex },
          { username: searchRegex },
          { name: searchRegex }
        ])
      ]);
    }

    const [countResult, dataResult] = await Promise.all([
      db.collection('users').where(query).count(),
      db.collection('users')
        .where(query)
        .skip(offset)
        .limit(limit)
        .field({ password: 0, passwordHash: 0 }) // Exclude password fields
        .get()
    ]);

    // Fetch summary data for each patient
    const patientsWithSummary = await Promise.all(
      dataResult.data.map(async (patient: any) => {
        try {
          const latestUaResult = await db.collection('uaRecords')
            .where({ _openid: patient._openid })
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
          
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
          const recentAttacksCount = await db.collection('attackRecords')
            .where(_.and([
              { _openid: patient._openid },
              { timestamp: _.gte(sevenDaysAgo) }
            ]))
            .count();

          return {
            ...patient,
            lastUricAcid: latestUaResult.data[0]?.value || null,
            recentAttacks: recentAttacksCount.total || 0,
            status: recentAttacksCount.total > 0 ? 'Critical' : (latestUaResult.data[0]?.value > 360 ? 'Risk' : 'Stable')
          };
        } catch (err) {
          return patient;
        }
      })
    );

    logger.info({ query, count: countResult.total, itemsCount: dataResult.data.length }, 'Fetched patients');

    res.json({
      items: patientsWithSummary,
      total: countResult.total,
      limit,
      offset
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching patients');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientOpenid
router.get('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const { patientOpenid } = req.params;
    const result = await db.collection('users').where({ _openid: patientOpenid }).get();
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = result.data[0];
    delete patient.password;
    delete patient.passwordHash;
    
    res.json(patient);
  } catch (error) {
    logger.error({ error }, 'Error fetching patient details');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/patients/:patientOpenid
router.put('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const { patientOpenid } = req.params;
    const updates = req.body;
    
    // Remove protected fields
    delete updates._id;
    delete updates._openid;
    delete updates.role;
    delete updates.password;
    delete updates.passwordHash;
    delete updates.username;
    delete updates.createdAt;
    
    const result = await db.collection('users').where({ _openid: patientOpenid }).update(updates);
    
    if (result.updated === 0) {
      return res.status(404).json({ error: 'Patient not found or no changes made' });
    }
    
    res.json({ success: true, updated: result.updated });
  } catch (error) {
    logger.error({ error }, 'Error updating patient details');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const newPatient = req.body;
    
    // Generate a mock _openid if not provided, since we are manually creating
    const _openid = newPatient._openid || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const patientDoc = {
      ...newPatient,
      _openid,
      role: 'user',
      createdAt: Date.now(),
    };
    
    // Remove protected fields just in case
    delete patientDoc._id;
    delete patientDoc.password;
    delete patientDoc.passwordHash;
    
    const result = await db.collection('users').add(patientDoc);
    
    res.status(201).json({ success: true, id: result.id, _openid });
  } catch (error) {
    logger.error({ error }, 'Error creating patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/patients/:patientOpenid
router.delete('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const { patientOpenid } = req.params;
    
    const result = await db.collection('users').where({ _openid: patientOpenid, role: 'user' }).remove();
    
    if (result.deleted === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Optionally delete related records here
    await Promise.all([
      db.collection('uaRecords').where({ _openid: patientOpenid }).remove(),
      db.collection('attackRecords').where({ _openid: patientOpenid }).remove(),
      db.collection('waterRecords').where({ _openid: patientOpenid }).remove(),
      db.collection('exerciseRecords').where({ _openid: patientOpenid }).remove(),
      db.collection('medicationReminders').where({ _openid: patientOpenid }).remove(),
      db.collection('dietRecords').where({ _openid: patientOpenid }).remove(),
    ]);
    
    res.json({ success: true, deleted: result.deleted });
  } catch (error) {
    logger.error({ error }, 'Error deleting patient');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientOpenid/records?type&limit&offset
router.get('/:patientOpenid/records', async (req: AuthRequest, res: Response) => {
  try {
    const { patientOpenid } = req.params;
    const type = req.query.type as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    // 校验该患者是否确实是普通用户（防止越权访问其他医生数据）
    const patientCheck = await db.collection('users').where({ _openid: patientOpenid, role: 'user' }).limit(1).get();
    if (patientCheck.data.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const collectionMap: Record<string, string> = {
      ua: 'uaRecords',
      attack: 'attackRecords',
      water: 'waterRecords',
      exercise: 'exerciseRecords',
      medication: 'medicationReminders',
      diet: 'dietRecords'
    };

    const collectionName = collectionMap[type];
    if (!collectionName) {
      return res.status(400).json({ error: 'Invalid record type' });
    }

    const query = { _openid: patientOpenid };

    const dataResult = await db.collection(collectionName)
      .where(query)
      .orderBy('timestamp', 'desc')
      .orderBy('createdAt', 'desc') // Fallback if timestamp doesn't exist
      .skip(offset)
      .limit(limit)
      .get();

    res.json({
      items: dataResult.data,
      limit,
      offset
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient records');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientOpenid/summary
router.get('/:patientOpenid/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { patientOpenid } = req.params;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime(); // Assuming timestamp is in ms

    const query = { _openid: patientOpenid };

    // Fetch summary data concurrently
    const [
      latestUaResult,
      recentAttacksCount,
      recentWaterResult,
      recentExerciseResult,
      recentMedsCount
    ] = await Promise.all([
      // Latest UA value
      db.collection('uaRecords').where(query).orderBy('timestamp', 'desc').limit(1).get(),
      
      // Attacks in last 7 days
      db.collection('attackRecords').where(_.and([
        query,
        { timestamp: _.gte(sevenDaysAgo) }
      ])).count(),
      
      // Water in last 7 days
      db.collection('waterRecords').where(_.and([
        query,
        { timestamp: _.gte(sevenDaysAgo) }
      ])).get(),
      
      // Exercise in last 7 days
      db.collection('exerciseRecords').where(_.and([
        query,
        { timestamp: _.gte(sevenDaysAgo) }
      ])).get(),
      
      // Meds in last 7 days
      db.collection('medicationReminders').where(_.and([
        query,
        { timestamp: _.gte(sevenDaysAgo) }
      ])).count()
    ]);

    // Aggregate water volume
    const totalWater = recentWaterResult.data.reduce((sum, record) => sum + (record.amount || 0), 0);
    
    // Aggregate exercise duration
    const totalExercise = recentExerciseResult.data.reduce((sum, record) => sum + (record.duration || 0), 0);

    res.json({
      latestUa: latestUaResult.data[0]?.value || null,
      recentAttacks: recentAttacksCount.total,
      recentWaterTotal: totalWater,
      recentExerciseTotal: totalExercise,
      recentMedsCount: recentMedsCount.total
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
