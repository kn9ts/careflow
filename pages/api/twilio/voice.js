import { VoiceResponse } from "twilio/lib/twiml/VoiceResponse";

export default function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const twiml = new VoiceResponse();

		// Answer the call
		twiml.say("Please hold while we connect your call", {
			voice: "alice",
			language: "en-US",
		});

		// Connect to the client
		const dial = twiml.dial();
		dial.client("browser");

		// Set content type and send response
		res.setHeader("Content-Type", "text/xml");
		res.status(200).send(twiml.toString());
	} catch (error) {
		console.error("Error generating TwiML:", error);
		res.status(500).json({ error: "Failed to generate TwiML" });
	}
}
