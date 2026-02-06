/**
 * Backblaze B2 Storage Service
 *
 * Uses AWS SDK for JavaScript v3 with Backblaze B2 S3-compatible API.
 * Replace AWS S3 with Backblaze B2 for cost-effective cloud storage.
 *
 * Get credentials from: https://secure.backblaze.com/app_keys.htm
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Backblaze B2 Configuration
 */
const getB2Config = () => {
  const endpoint =
    process.env.BACKBLAZE_ENDPOINT || "https://s3.us-east-1.backblazeb2.com";
  const region = process.env.BACKBLAZE_REGION || "us-east-1";
  const keyId = process.env.BACKBLAZE_KEY_ID;
  const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
  const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

  return {
    endpoint,
    region,
    keyId,
    applicationKey,
    bucketName,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
  };
};

/**
 * Create S3 client for Backblaze B2
 */
const createS3Client = () => {
  const config = getB2Config();

  if (!config.keyId || !config.applicationKey || !config.bucketName) {
    console.warn("Backblaze B2 credentials not configured");
    return null;
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
  });
};

/**
 * Backblaze B2 Storage Class
 */
class BackblazeStorage {
  constructor() {
    this.client = null;
    this.bucketName = null;
  }

  /**
   * Initialize the storage client
   */
  initialize() {
    const config = getB2Config();

    if (!config.keyId || !config.applicationKey || !config.bucketName) {
      console.warn(
        "Backblaze B2 not configured - storage operations will fail",
      );
      return false;
    }

    this.client = createS3Client();
    this.bucketName = config.bucketName;
    console.log(`Backblaze B2 initialized: ${this.bucketName}`);
    return true;
  }

  /**
   * Check if B2 is configured
   */
  isConfigured() {
    const config = getB2Config();
    return !!(config.keyId && config.applicationKey && config.bucketName);
  }

  /**
   * Upload a file to Backblaze B2
   * @param {string} key - Object key (path in bucket)
   * @param {Buffer|Uint8Array|Blob|string} body - File content
   * @param {string} contentType - MIME type
   * @returns {Promise<{key: string, url: string, bucket: string}>}
   */
  async uploadFile(key, body, contentType = "application/octet-stream") {
    if (!this.client) {
      throw new Error("Backblaze B2 not initialized");
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);

    const config = getB2Config();
    const url = `${config.endpoint}/${this.bucketName}/${key}`;

    return {
      key,
      url,
      bucket: this.bucketName,
    };
  }

  /**
   * Upload a recording file
   * @param {string} callId - Call ID for organizing recordings
   * @param {Buffer} buffer - Audio file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<{key: string, url: string}>}
   */
  async uploadRecording(callId, buffer, filename) {
    const key = `recordings/${callId}/${Date.now()}-${filename}`;
    return this.uploadFile(key, buffer, "audio/webm");
  }

  /**
   * Get a signed URL for temporary access
   * @param {string} key - Object key
   * @param {number} expiresIn - Expiration time in seconds (default: 3600)
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.client) {
      throw new Error("Backblaze B2 not initialized");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get a file from Backblaze B2
   * @param {string} key - Object key
   * @returns {Promise<Buffer>}
   */
  async getFile(key) {
    if (!this.client) {
      throw new Error("Backblaze B2 not initialized");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete a file from Backblaze B2
   * @param {string} key - Object key
   */
  async deleteFile(key) {
    if (!this.client) {
      throw new Error("Backblaze B2 not initialized");
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
    return { key, deleted: true };
  }

  /**
   * List files in a directory
   * @param {string} prefix - Prefix (directory path)
   * @param {number} maxKeys - Maximum number of keys to return
   * @returns {Promise<Array<{key: string, size: number, lastModified: Date}>>}
   */
  async listFiles(prefix, maxKeys = 1000) {
    if (!this.client) {
      throw new Error("Backblaze B2 not initialized");
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);

    return (response.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
    }));
  }

  /**
   * Get file metadata
   * @param {string} key - Object key
   * @returns {Promise<{size: number, contentType: string, lastModified: Date}>}
   */
  async getFileMetadata(key) {
    if (!this.client) {
      throw new Error("Backblaze B2 not initialized");
    }

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  }

  /**
   * Check if a file exists
   * @param {string} key - Object key
   * @returns {Promise<boolean>}
   */
  async fileExists(key) {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      if (error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }
}

// Create singleton instance
const backblazeStorage = new BackblazeStorage();

// Auto-initialize on import
if (typeof window === "undefined") {
  backblazeStorage.initialize();
}

export default backblazeStorage;
export { BackblazeStorage };
