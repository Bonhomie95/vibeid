import mongoose from 'mongoose';
import { config } from './env';

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  connected = true;
  // eslint-disable-next-line no-console
  console.log(`[db] connected to ${config.mongoUri.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2')}`);
}

export async function disconnectDB(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
