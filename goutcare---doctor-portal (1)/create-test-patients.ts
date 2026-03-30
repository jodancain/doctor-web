import 'dotenv/config';
import { db } from './server/db';

async function createTestPatients() {
  try {
    const patients = [
      {
        _openid: 'user_openid_1',
        username: 'patient1',
        role: 'user',
        nickName: '张建国',
        gender: 'Male',
        age: 55,
        diagnosis: '原发性痛风',
        status: 'Critical',
        lastUricAcid: 580,
        targetUricAcid: 360,
        medication: '非布司他 40mg/日',
        lastVisit: '2023-10-25',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _openid: 'user_openid_2',
        username: 'patient2',
        role: 'user',
        nickName: '李秀兰',
        gender: 'Female',
        age: 62,
        diagnosis: '痛风性关节炎',
        status: 'Risk',
        lastUricAcid: 420,
        targetUricAcid: 300,
        medication: '别嘌醇 100mg/日',
        lastVisit: '2023-10-20',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _openid: 'user_openid_3',
        username: 'patient3',
        role: 'user',
        nickName: '王大伟',
        gender: 'Male',
        age: 42,
        diagnosis: '高尿酸血症',
        status: 'Stable',
        lastUricAcid: 350,
        targetUricAcid: 360,
        medication: '苯溴马隆 50mg/日',
        lastVisit: '2023-10-15',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const p of patients) {
      // Check if exists
      const existing = await db.collection('users').where({ _openid: p._openid }).get();
      if (existing.data.length > 0) {
        console.log(`Patient ${p.nickName} already exists. Skipping...`);
      } else {
        await db.collection('users').add(p);
        console.log(`Inserted patient ${p.nickName}`);
      }
    }

    console.log('Successfully created test patients!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test patients:', error);
    process.exit(1);
  }
}

createTestPatients();
