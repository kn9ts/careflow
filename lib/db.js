import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Database connection options with performance and reliability optimizations
 */
const CONNECTION_OPTIONS = {
  bufferCommands: false,
  maxPoolSize: 50, // Increased from 10 for better scalability
  minPoolSize: 5, // Added to maintain minimum pool size
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  serverSelectionTimeoutMS: 15000, // Increased from 10000
  socketTimeoutMS: 60000, // Increased from 45000
  connectTimeoutMS: 30000, // Increased from 15000
  heartbeatFrequencyMS: 10000, // Check connection every 10 seconds
  retryWrites: true,
  w: 'majority', // Ensure write operations are acknowledged by majority of replicas
};

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, CONNECTION_OPTIONS);
  }

  try {
    cached.conn = await cached.promise;

    // Handle connection events - only attach once after connection is established
    if (mongoose.connection.listenerCount('connected') === 0) {
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
      });
    }

    if (mongoose.connection.listenerCount('error') === 0) {
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        // Reset cache on connection error
        cached.promise = null;
        cached.conn = null;
      });
    }

    if (mongoose.connection.listenerCount('disconnected') === 0) {
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        // Reset cache on disconnection
        cached.promise = null;
        cached.conn = null;
      });
    }

    if (mongoose.connection.listenerCount('reconnected') === 0) {
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });
    }

    // Handle application termination
    if (process.listenerCount('SIGINT') === 0) {
      process.on('SIGINT', async () => {
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed through app termination');
          process.exit(0);
        } catch (error) {
          console.error('Error closing MongoDB connection:', error);
          process.exit(1);
        }
      });
    }

    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection failed:', e);
    throw new Error(`Failed to connect to MongoDB: ${e.message}`);
  }
}

export async function disconnectDB() {
  if (cached.conn) {
    try {
      await mongoose.disconnect();
      cached.conn = null;
      cached.promise = null;
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}

/**
 * Get database connection status
 */
export function getDBStatus() {
  if (!cached.conn) {
    return { connected: false, status: 'disconnected', poolSize: 0 };
  }

  const { readyState, connections } = mongoose.connection;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    connected: readyState === 1,
    status: states[readyState] || 'unknown',
    poolSize: connections.length,
  };
}
