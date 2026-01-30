export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Mock analytics data - in a real application, this would come from your database
		const analytics = {
			totalCalls: 156,
			totalDuration: 4520, // in seconds
			totalRecordings: 142,
			averageCallDuration: 290, // in seconds
		};

		res.status(200).json(analytics);
	} catch (error) {
		console.error("Error fetching analytics:", error);
		res.status(500).json({ error: "Failed to fetch analytics" });
	}
}
