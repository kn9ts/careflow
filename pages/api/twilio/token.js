import { Twilio } from "twilio";

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const accountSid = process.env.TWILIO_ACCOUNT_SID;
		const apiKey = process.env.TWILIO_API_KEY;
		const apiSecret = process.env.TWILIO_API_SECRET;
		const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

		if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
			return res.status(500).json({
				error: "Missing Twilio environment variables",
			});
		}

		const client = new Twilio(apiKey, apiSecret, { accountSid });

		// Generate a random identity for the client
		const identity = `user_${Math.random().toString(36).substr(2, 9)}`;

		// Create access token
		const token = new client.jwt.AccessToken(accountSid, apiKey, apiSecret, {
			identity,
		});

		// Create Voice grant
		const voiceGrant = new client.jwt.AccessToken.VoiceGrant({
			outgoingApplicationSid: twimlAppSid,
			incomingAllow: true,
		});

		token.addGrant(voiceGrant);

		res.status(200).json({
			token: token.toJwt(),
			identity,
		});
	} catch (error) {
		console.error("Error generating Twilio token:", error);
		res.status(500).json({ error: "Failed to generate token" });
	}
}
