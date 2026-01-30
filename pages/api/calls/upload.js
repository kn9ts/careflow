import { uploadFile } from "../../../lib/firebaseStorage";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { file, fileName, contentType } = req.body;

		if (!file) {
			return res.status(400).json({ error: "No file provided" });
		}

		// Convert base64 file data to buffer
		const fileBuffer = Buffer.from(file, "base64");

		// Generate a unique filename if not provided
		const finalFileName = fileName || `recording_${Date.now()}.wav`;
		const finalContentType = contentType || "audio/wav";

		// Upload to Firebase Storage
		const publicUrl = await uploadFile(
			fileBuffer,
			finalFileName,
			finalContentType,
		);

		res.status(200).json({
			message: "File uploaded successfully",
			url: publicUrl,
			fileName: finalFileName,
		});
	} catch (error) {
		console.error("Error uploading file:", error);
		res
			.status(500)
			.json({ error: "Failed to upload file", details: error.message });
	}
}

// Increase body size limit for file uploads
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "10mb",
		},
	},
};
