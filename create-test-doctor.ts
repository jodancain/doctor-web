import 'dotenv/config';
import { db } from './server/db';
import bcrypt from 'bcrypt';

async function createTestDoctor() {
  try {
    const username = 'testdoctor';
    const password = 'password123';
    
    // Check if exists
    const existing = await db.collection('users').where({ username }).get();
    if (existing.data.length > 0) {
      console.log('Test doctor already exists. Deleting...');
      await db.collection('users').doc(existing.data[0]._id).remove();
    }

    // Insert new doctor with plaintext password to test auto-migration
    // Or just insert with plaintext to let the login route hash it
    const res = await db.collection('users').add({
      username,
      password, // Plaintext, will be hashed on first login
      role: 'doctor',
      nickName: 'Dr. Test',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Successfully created test doctor account!');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Document ID:', res.id);
    process.exit(0);
  } catch (error) {
    console.error('Error creating test doctor:', error);
    process.exit(1);
  }
}

createTestDoctor();
