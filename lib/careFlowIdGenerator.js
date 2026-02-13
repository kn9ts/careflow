/**
 * CareFlow ID Generator Utility
 *
 * Generates unique care4w-XXXXXXX IDs for WebRTC calls.
 * Format: care4w-{7-digit-sequence}
 * Example: care4w-1000001
 */

import mongoose from 'mongoose';
import User from '@/models/User';

/**
 * Generate a unique care4wId for a new user
 * @param {mongoose.Connection} dbConnection - MongoDB connection
 * @returns {Promise<string>} The generated care4wId
 */
export async function generateCare4wId(dbConnection = null) {
  // Get the sequence number
  const sequenceNumber = await getNextSequence();

  // Format: care4w-{7-digit-zero-padded-sequence}
  const care4wId = `care4w-${sequenceNumber.toString().padStart(7, '0')}`;

  return {
    care4wId,
    sequenceNumber,
  };
}

/**
 * Get the next sequence number for care4wId
 * Uses MongoDB's findOneAndUpdate with upsert to atomically increment
 */
async function getNextSequence() {
  // Try to import and use the db connection
  let connection = null;

  try {
    // Try to use the default mongoose connection first
    if (mongoose.connection.readyState === 1) {
      connection = mongoose.connection;
    }
  } catch (error) {
    console.warn('Could not access mongoose connection:', error.message);
  }

  // If we have a connection, use it for atomic operations
  if (connection) {
    try {
      // Use a dedicated counter collection
      const counter = await connection
        .collection('counters')
        .findOneAndUpdate(
          { _id: 'care4wSequence' },
          { $inc: { sequence: 1 } },
          { upsert: true, returnDocument: 'after' }
        );

      // Start from 1000001 if this is the first time
      const sequence = counter?.sequence || 1;
      return 1000000 + sequence;
    } catch (error) {
      console.warn('Counter collection not available, using fallback:', error.message);
    }
  }

  // Fallback: Find the highest existing sequence number
  try {
    // Try to find the highest care4wId
    const highestUser = await User.findOne()
      .sort({ sequenceNumber: -1 })
      .select('sequenceNumber')
      .lean();

    if (highestUser?.sequenceNumber) {
      return highestUser.sequenceNumber + 1;
    }

    // Start from 1000001
    return 1000001;
  } catch (error) {
    console.warn('Could not query User model:', error.message);
    // Fallback to a random number based on timestamp
    const timestamp = Date.now() % 1000000;
    return 1000000 + timestamp;
  }
}

/**
 * Validate a care4wId format
 * @param {string} care4wId - The ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidCare4wId(care4wId) {
  if (!care4wId || typeof care4wId !== 'string') {
    return false;
  }
  return /^care4w-\d{7}$/.test(care4wId);
}

/**
 * Look up a user by their care4wId
 * @param {string} care4wId - The care4wId to look up
 * @returns {Promise<{exists: boolean, displayName?: string, uid?: string}>}
 */
export async function lookupCare4wId(care4wId) {
  if (!isValidCare4wId(care4wId)) {
    return { exists: false };
  }

  try {
    const user = await User.findOne({ care4wId }).select('displayName firebaseUid').lean();

    if (user) {
      return {
        exists: true,
        displayName: user.displayName,
        uid: user.firebaseUid,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error looking up care4wId:', error);
    return { exists: false };
  }
}

export default {
  generateCare4wId,
  isValidCare4wId,
  lookupCare4wId,
};
