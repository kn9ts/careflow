export default function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { CallSid, RecordingUrl, RecordingDuration } = req.body;

		// Log the webhook data
		console.log("Recording webhook received:", {
			CallSid,
			RecordingUrl,
			RecordingDuration,
		});

		// Here you would typically:
		// 1. Save the recording metadata to your database
		// 2. Process the recording (transcription, analysis, etc.)
		// 3. Send notifications to users

		res.status(200).json({ message: "Webhook received" });
	} catch (error) {
		console.error("Error processing webhook:", error);
		res.status(500).json({ error: "Failed to process webhook" });
	}
}
