/**
 * Recording Management API
 *
 * Endpoints for managing recordings:
 * - GET /api/recordings - List recordings with filters
 * - GET /api/recordings/stats - Get recording statistics
 */

import { connectDB } from '@/lib/db';
import Recording from '@/models/Recording';
import backblazeStorage from '@/lib/backblaze';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// Force dynamic rendering - this route uses request.headers for auth
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (auth.error) {
      return errorResponse('Unauthorized', { status: 401 });
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // 'call' or 'voicemail'
    const direction = searchParams.get('direction'); // 'inbound' or 'outbound'
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'recordedAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query = { firebaseUid: auth.user.uid };

    if (type) query.type = type;
    if (direction) query.direction = direction;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [recordings, total] = await Promise.all([
      Recording.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Recording.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

    return successResponse({
      recordings: recordings.map((r) => ({
        id: r._id,
        _id: r._id, // Include both for compatibility
        type: r.type,
        callMode: r.callMode,
        callSid: r.callSid, // Include callSid for recording access
        from: r.from,
        to: r.to,
        direction: r.direction,
        duration: r.duration,
        fileSize: r.fileSize,
        format: r.format,
        recordedAt: r.recordedAt,
        status: r.status,
        isListened: r.isListened,
        // Derived callStatus for frontend consistency
        callStatus:
          r.duration > 0
            ? 'completed'
            : r.status === 'no-answer'
              ? 'missed'
              : r.status === 'failed'
                ? 'failed'
                : 'missed',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return errorResponse('Failed to fetch recordings', { status: 500 });
  }
}
