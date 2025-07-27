const mongoose = require('mongoose');
const { MONGO_URI } = require('../config/Constants');

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');
    
    const db = mongoose.connection.db;
    
    console.log('Creating indexes...');
    
    await db.collection('appointments').createIndex({ patientId: 1, scheduledFor: 1 });
    await db.collection('appointments').createIndex({ doctorId: 1, scheduledFor: 1 });
    await db.collection('appointments').createIndex({ scheduledFor: 1, status: 1 });
    await db.collection('appointments').createIndex({ status: 1 });
    await db.collection('appointments').createIndex({ patientId: 1, status: 1 });
    await db.collection('appointments').createIndex({ doctorId: 1, status: 1 });
    
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ emailVerified: 1 });
    
    await db.collection('doctors').createIndex({ doctorId: 1 }, { unique: true });
    await db.collection('doctors').createIndex({ specialization: 1 });
    await db.collection('doctors').createIndex({ location: '2dsphere' });
    
    await db.collection('refreshtokens').createIndex({ userId: 1 });
    await db.collection('refreshtokens').createIndex({ token: 1 }, { unique: true });
    await db.collection('refreshtokens').createIndex({ revoked: 1 });
    
    console.log('All indexes created successfully');
    
    const collections = ['appointments', 'users', 'doctors', 'refreshtokens'];
    for (const collName of collections) {
      const indexes = await db.collection(collName).indexes();
      console.log(`\nIndexes for ${collName}:`);
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

createIndexes();