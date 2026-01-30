export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Mock call history data - in a real application, this would come from your database
		const calls = [
			{
				id: "call_001",
				date: "2024-01-15 14:30:00",
				from: "+1234567890",
				to: "+0987654321",
				duration: "2m 30s",
				status: "completed",
				recordingUrl: "https://example.com/recordings/call_001.wav",
			},
			{
				id: "call_002",
				date: "2024-01-15 13:45:00",
				from: "+1112223333",
				to: "+4445556666",
				duration: "5m 15s",
				status: "completed",
				recordingUrl: "https://example.com/recordings/call_002.wav",
			},
			{
				id: "call_003",
				date: "2024-01-14 16:20:00",
				from: "+7778889999",
				to: "+0001112222",
				duration: "1m 45s",
				status: "missed",
				recordingUrl: null,
			},
			{
				id: "call_004",
				date: "2024-01-14 11:10:00",
				from: "+3334445555",
				to: "+6667778888",
				duration: "8m 20s",
				status: "completed",
				recordingUrl: "https://example.com/recordings/call_004.wav",
			},
			{
				id: "call_005",
				date: "2024-01-13 15:05:00",
				from: "+9990001111",
				to: "+2223334444",
				duration: "3m 10s",
				status: "completed",
				recordingUrl: "https://example.com/recordings/call_005.wav",
			},
		];

		res.status(200).json({ calls });
	} catch (error) {
		console.error("Error fetching call history:", error);
		res.status(500).json({ error: "Failed to fetch call history" });
	}
}
