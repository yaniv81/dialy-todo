import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

console.log('Testing connection to:', uri ? uri.split('@')[1] : 'undefined'); // Log only part of URI for safety

if (!uri) {
  console.error('Error: MONGODB_URI is undefined in .env');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Connection failed!');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.code) console.error('Error code:', err.code);
    if (err.codeName) console.error('Error codeName:', err.codeName);
    process.exit(1);
  });
