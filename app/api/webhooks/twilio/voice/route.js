import { NextResponse } from 'next/server';
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { sendIncomingCallNotification } from '@/lib/notifications';

export async function POST(request) {
  try {
    // Connect to database
    await connectDB();

    // Parse form data from Twilio webhook
    const formData = await request.formData();
    const from = formData.get('From');
    const to = formData.get('To');
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');

    console.log(`Incoming call from ${from} to ${to} (SID: ${callSid}, Status: ${callStatus})`);

    // Find the user who owns this Twilio phone number
    const user = await User.findOne({ twilioPhoneNumber: to });

    if (!user) {
      console.error(`No user found for phone number: ${to}`);
      // Return a simple response if no user found
      const twiml = new VoiceResponse();
      twiml.say('Sorry, this number is not configured.');
      return new Response(twiml.toString(), {
        headers: {
          'Content-Type': 'application/xml',
        },
      });
    }

    // Send push notification for incoming call
    // Send asynchronously to avoid delaying the TwiML response
    if (callStatus === 'ringing' || !callStatus) {
      sendIncomingCallNotification(user.firebaseUid, {
        callSid,
        from,
        to,
      }).catch((error) => {
        console.error('Failed to send incoming call notification:', error);
      });
    }

    // Create TwiML response to connect to browser client
    const twiml = new VoiceResponse();

    // Add some initial message
    twiml.say('Connecting your call');

    // Connect to the browser client using user's twilioClientIdentity
    const dial = twiml.dial();
    dial.client(user.twilioClientIdentity);

    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Voice webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
