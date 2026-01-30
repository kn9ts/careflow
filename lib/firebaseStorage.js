import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
	initializeApp({
		credential: cert({
			projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
			clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
		}),
		storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	});
}

const storage = getStorage();
const bucket = storage.bucket();

/**
 * Upload a file to Firebase Storage
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - The file name
 * @param {string} contentType - The content type (e.g., 'audio/wav')
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadFile(fileBuffer, fileName, contentType) {
	const file = bucket.file(`recordings/${fileName}`);

	await file.save(fileBuffer, {
		metadata: {
			contentType: contentType,
		},
	});

	// Make the file publicly accessible
	await file.makePublic();

	// Get the public URL
	const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
	return publicUrl;
}

/**
 * Get a signed URL for downloading a file
 * @param {string} filePath - The path to the file in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - The signed download URL
 */
export async function getDownloadUrl(filePath, expiresIn = 3600) {
	const file = bucket.file(filePath);

	const [url] = await file.getSignedUrl({
		action: "read",
		expires: Date.now() + expiresIn * 1000,
	});

	return url;
}

/**
 * List all recordings in the storage bucket
 * @returns {Promise<Array>} - Array of file metadata
 */
export async function listRecordings() {
	const [files] = await bucket.getFiles({ prefix: "recordings/" });

	const recordings = await Promise.all(
		files.map(async (file) => {
			const [metadata] = await file.getMetadata();
			return {
				name: file.name,
				size: metadata.size,
				contentType: metadata.contentType,
				timeCreated: metadata.timeCreated,
				updated: metadata.updated,
			};
		}),
	);

	return recordings;
}

/**
 * Delete a file from Firebase Storage
 * @param {string} filePath - The path to the file
 * @returns {Promise<void>}
 */
export async function deleteFile(filePath) {
	const file = bucket.file(filePath);
	await file.delete();
}

export { bucket, storage };
