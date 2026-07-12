import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function listReservations() {
  console.log('Initializing Firebase Admin...');
  const app = initializeApp({
    projectId: 'rahito-restaurant',
  });

  const db = getFirestore(app);
  console.log('Fetching reservations from default database...');

  try {
    const snap = await db.collection('reservations').get();
    console.log(`Found ${snap.size} documents in 'reservations' collection:`);
    snap.forEach((doc) => {
      console.log(`- ID: ${doc.id}`);
      console.log('  Data:', doc.data());
    });
  } catch (err: any) {
    console.error('Error fetching reservations:', err.message || err);
  }
}

listReservations();
