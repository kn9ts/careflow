import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import Recording from '@/models/Recording';
import { successResponse, errorResponse, handleAuthResult } from '@/lib/apiResponse';

// Force dynamic rendering - this route uses request.headers for auth
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    // Connect to database
    await connectDB();

    const { firebaseUid } = auth.user;

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get basic statistics
    const totalCalls = await Recording.countDocuments({
      firebaseUid,
      type: 'call',
    });

    const totalVoicemails = await Recording.countDocuments({
      firebaseUid,
      type: 'voicemail',
    });

    const totalDuration = await Recording.aggregate([
      {
        $match: {
          firebaseUid,
          type: 'call',
          duration: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
        },
      },
    ]);

    const totalDurationSeconds = totalDuration[0]?.totalDuration || 0;

    // Get today's calls
    const todayCalls = await Recording.countDocuments({
      firebaseUid,
      type: 'call',
      recordedAt: { $gte: todayStart },
    });

    // Get today's inbound calls (received calls)
    const todayReceivedCalls = await Recording.countDocuments({
      firebaseUid,
      type: 'call',
      direction: 'inbound',
      recordedAt: { $gte: todayStart },
    });

    // Get today's missed calls (inbound calls with 0 duration)
    const todayMissedCalls = await Recording.countDocuments({
      firebaseUid,
      type: 'call',
      direction: 'inbound',
      duration: { $eq: 0 },
      recordedAt: { $gte: todayStart },
    });

    // Get today's total duration
    const todayDuration = await Recording.aggregate([
      {
        $match: {
          firebaseUid,
          type: 'call',
          duration: { $gt: 0 },
          recordedAt: { $gte: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
        },
      },
    ]);

    const todayDurationSeconds = todayDuration[0]?.totalDuration || 0;

    // Calculate total storage used (sum of all file sizes)
    const storageUsed = await Recording.aggregate([
      {
        $match: {
          firebaseUid,
          fileSize: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    const totalStorageUsed = storageUsed[0]?.totalSize || 0;

    // Calculate success rate (calls with duration > 0)
    const successfulCalls = await Recording.countDocuments({
      firebaseUid,
      type: 'call',
      duration: { $gt: 0 },
    });
    const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Get recent calls with derived call status
    const recentCalls = await Recording.find({
      firebaseUid,
      type: 'call',
    })
      .sort({ recordedAt: -1 })
      .limit(10)
      .lean();

    // Add derived call status to each recent call
    const recentCallsWithStatus = recentCalls.map((call) => ({
      ...call,
      callStatus: call.duration > 0 ? 'completed' : 'missed',
    }));

    return successResponse({
      analytics: {
        totalCalls,
        totalVoicemails,
        totalDuration: totalDurationSeconds,
        averageCallDuration: totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0,
        todayCalls,
        todayReceivedCalls,
        todayMissedCalls,
        todayDuration: todayDurationSeconds,
        successRate,
        storageUsed: totalStorageUsed,
        recentCalls: recentCallsWithStatus,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return errorResponse('Failed to fetch analytics', {
      status: 500,
      code: 'ANALYTICS_FETCH_FAILED',
    });
  }
}
