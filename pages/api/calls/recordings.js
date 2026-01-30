import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { recordingUrl } = req.query;

		if (!recordingUrl) {
			return res.status(400).json({ error: "Recording URL is required" });
		}

		// Extract the recording SID from the URL
		const recordingSid = recordingUrl.split("/").pop();

		const s3 = new S3Client({
			region: process.env.AWS_REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		const command = new GetObjectCommand({
			Bucket: process.env.AWS_S3_BUCKET,
			Key: `recordings/${recordingSid}.wav`,
		});

		const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry

		res.status(200).json({ downloadUrl: url });
	} catch (error) {
		console.error("Error generating download URL:", error);
		res.status(500).json({ error: "Failed to generate download URL" });
	}
}
