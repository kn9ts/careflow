import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { file } = req.body;

		if (!file) {
			return res.status(400).json({ error: "No file provided" });
		}

		const s3 = new S3Client({
			region: process.env.AWS_REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		const key = `recordings/${Date.now()}_${file.name}`;

		const command = new PutObjectCommand({
			Bucket: process.env.AWS_S3_BUCKET,
			Key: key,
			Body: file,
			ContentType: file.type,
		});

		await s3.send(command);

		res.status(200).json({
			message: "File uploaded successfully",
			key: key,
		});
	} catch (error) {
		console.error("Error uploading file:", error);
		res.status(500).json({ error: "Failed to upload file" });
	}
}
