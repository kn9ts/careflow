import { getDownloadUrl, listRecordings } from "../../../lib/firebaseStorage";

export default async function handler(req, res) {
	if (req.method === "GET") {
		try {
			const { recordingUrl, list } = req.query;

			// If list parameter is provided, return all recordings
			if (list === "true") {
				const recordings = await listRecordings();
				return res.status(200).json({ recordings });
			}

			// If recordingUrl is provided, generate a download URL
			if (recordingUrl) {
				// Extract the file path from the URL or use as-is if it's a path
				const filePath = recordingUrl.includes("http")
					? recordingUrl.split("/").slice(-2).join("/") // Extract path from URL
					: `recordings/${recordingUrl}`;

				const downloadUrl = await getDownloadUrl(filePath);
				return res.status(200).json({ downloadUrl });
			}

			return res.status(400).json({
				error: "Please provide either 'recordingUrl' or 'list=true' parameter",
			});
		} catch (error) {
			console.error("Error handling recording request:", error);
			res
				.status(500)
				.json({ error: "Failed to process request", details: error.message });
		}
	} else {
		return res.status(405).json({ error: "Method not allowed" });
	}
}
