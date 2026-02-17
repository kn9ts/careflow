---
# Backblaze B2 Storage Guide

## Overview

CareFlow uses Backblaze B2 as the primary cloud storage provider for call recordings. Backblaze B2 offers:

- **Cost-effective**: Up to 75% cheaper than AWS S3
- **S3-compatible**: Uses AWS SDK v3
- **Simple setup**: No complex bucket policies
- **Reliable**: 99.9% uptime SLA

## Why Backblaze B2?

### Cost Comparison

| Feature | AWS S3 | Backblaze B2 |
|---------|--------|--------------|
| Storage/GB/month | $0.023 | $0.005 |
| Download/GB | $0.09 | $0.01 |
| Upload | Free | Free |
| API Calls | $0.0004/1K | $0.004/1K |

**Savings**: Up to 75% on storage and 89% on download costs

### Comparison with Firebase Storage

| Feature | Firebase Storage | Backblaze B2 |
|---------|------------------|--------------|
| Pricing | Pay-as-you-go | Predictable tiers |
| S3 Compatibility | No | Yes |
| Presigned URLs | Limited | Full support |
| Large Files | Limited to 5GB | Up to 5TB |

## Setup Instructions

### Step 1: Create Backblaze B2 Account

1. Go to [Backblaze B2](https://www.backblazeb2.com)
2. Click "Sign Up Free"
3. Fill in your details
4. Verify your email

### Step 2: Create Bucket

1. Log in to [Backblaze B2 Console](https://secure.backblazeb2.com)
2. Click **Buckets** in the left sidebar
3. Click **Create Bucket**
4. Enter bucket name: `careflow-recordings-{env}` (e.g., `careflow-recordings-prod`)
5. Set bucket to **Private** (we'll use presigned URLs)
6. Click **Create Bucket**

### Step 3: Create Application Key

1. Click **Application Keys** in the left sidebar
2. Click **Add Application Key**
3. Key name: `careflow-{env}` (e.g., `careflow-prod`)
4. Access Key ID: Note this down (starts with `004...`)
5. Secret Key: Click to reveal **IMPORTANT: Save this immediately**
6. Permissions: Select **Read and Write**
7. Click **Create Key**

### Step 4: Get Endpoint URL

1. Click **Buckets**
2. Find your bucket
3. Note the **Endpoint** URL (e.g., `https://s3.us-east-1.backblazeb2.com`)

## Environment Variables

### Required Variables

```bash
# Backblaze B2 Configuration
BACKBLAZE_KEY_ID=004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BACKBLAZE_APPLICATION_KEY=your-secret-key-here
BACKBLAZE_BUCKET_NAME=careflow-recordings-prod
BACKBLAZE_ENDPOINT=https://s3.us-east-1.backblazeb2.com
BACKBLAZE_REGION=us-east-1
```

### Where to Get Each Variable

| Variable | Location |
|----------|----------|
| `BACKBLAZE_KEY_ID` | Application Keys page (starts with `004`) |
| `BACKBLAZE_APPLICATION_KEY` | Shown once when creating key |
| `BACKBLAZE_BUCKET_NAME` | Buckets page |
| `BACKBLAZE_ENDPOINT` | Bucket details page |

## CORS Configuration

For browser uploads, configure CORS on your bucket:

### Using b2 CLI

```bash
# Install b2 CLI
pip install b2

# Authenticate
b2 authorize_account <KEY_ID> <APPLICATION_KEY>

# Set CORS
b2 update-bucket --cors-rules '[{
    "allowedHeaders": ["*"],
    "allowedMethods": ["GET", "PUT", "POST"],
    "allowedOrigins": ["https://your-domain.vercel.app", "http://localhost:3000"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
}]' careflow-recordings-prod
```

### Using Backblaze Console

1. Go to Bucket settings
2. Scroll to **CORS Rules**
3. Add rule:
```json
[
    {
        "allowedHeaders": ["*"],
        "allowedMethods": ["GET", "PUT", "POST"],
        "allowedOrigins": ["https://your-domain.vercel.app"],
        "exposeHeaders": ["ETag"],
        "maxAgeSeconds": 3600
    }
]
```

## Usage in CareFlow

### Uploading a Recording

```javascript
import backblazeStorage from '@/lib/backblaze';

// Upload recording
const result = await backblazeStorage.uploadRecording(
  callId,        // e.g., "CA123456"
  fileBuffer,    // Audio file buffer
  "recording.webm" // Filename
);

// Returns: { key, url, bucket }
console.log(result.key);   // "recordings/CA123xyz/1701234567-recording.webm"
console.log(result.url);   // "https://s3.us-east-1.backblazeb2.com/careflow-recordings/..."
```

### Getting Presigned URL

```javascript
// Get temporary download URL (valid for 1 hour)
const url = await backblazeStorage.getSignedUrl('recordings/CA123/recording.webm');
// Returns: "https://s3.us-east-1.backblazeb2.com/...?X-Amz-Expires=3600&..."
```

### Listing Recordings

```javascript
// List all recordings for a call
const files = await backblazeStorage.listFiles(`recordings/${callId}`);
// Returns: [{ key, size, lastModified }, ...]
```

### Deleting a Recording

```javascript
// Delete recording
await backblazeStorage.deleteFile('recordings/CA123/recording.webm');
```

## API Reference

### BackblazeStorage Class

```javascript
class BackblazeStorage {
  // Initialize the storage client
  initialize(): boolean

  // Check if B2 is configured
  isConfigured(): boolean

  // Upload a file
  async uploadFile(
    key: string,
    body: Buffer|Uint8Array|Blob|string,
    contentType?: string
  ): Promise<{key: string, url: string, bucket: string}>

  // Upload recording
  async uploadRecording(
    callId: string,
    buffer: Buffer,
    filename: string
  ): Promise<{key: string, url: string}>

  // Get presigned URL
  async getSignedUrl(key: string, expiresIn?: number): Promise<string>

  // Get file content
  async getFile(key: string): Promise<Buffer>

  // Delete file
  async deleteFile(key: string): Promise<{key: string, deleted: boolean}>

  // List files
  async listFiles(prefix: string, maxKeys?: number): Promise<Array<{
    key: string,
    size: number,
    lastModified: Date
  }>>

  // Get file metadata
  async getFileMetadata(key: string): Promise<{
    size: number,
    contentType: string,
    lastModified: Date
  }>

  // Check if file exists
  async fileExists(key: string): Promise<boolean>
}
```

## Error Handling

### Common Errors

```javascript
import backblazeStorage from '@/lib/backblaze';

try {
  await backblazeStorage.uploadRecording(callId, buffer, filename);
} catch (error) {
  if (error.name === 'NoSuchBucket') {
    console.error('Bucket does not exist');
  } else if (error.name === 'AccessDenied') {
    console.error('Check your B2 credentials');
  } else {
    console.error('Upload failed:', error.message);
  }
}
```

## Billing and Monitoring

### View Usage

1. Log in to Backblaze B2 Console
2. Click **Billing** in the sidebar
3. View current month usage

### Set Alerts

1. Go to **Billing** > **Alerts**
2. Set threshold (e.g., $10)
3. Enter email for notifications

## Migration from AWS S3

### Updating Environment Variables

| AWS S3 Variable | Backblaze B2 Variable |
|----------------|----------------------|
| `AWS_ACCESS_KEY_ID` | `BACKBLAZE_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `BACKBLAZE_APPLICATION_KEY` |
| `AWS_REGION` | `BACKBLAZE_REGION` |
| `AWS_S3_BUCKET` | `BACKBLAZE_BUCKET_NAME` |
| `AWS_ENDPOINT` | `BACKBLAZE_ENDPOINT` |

### Code Changes

No code changes needed! The AWS SDK v3 is compatible with Backblaze B2:

```javascript
// Old S3 code (still works!)
import { S3Client } from '@aws-sdk/client-s3';

// Just change the endpoint
const client = new S3Client({
  region: process.env.BACKBLAZE_REGION,
  endpoint: process.env.BACKBLAZE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.BACKBLAZE_KEY_ID,
    secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY,
  },
});
```

## Security Best Practices

### 1. Use Application Keys

Not master keys - create application keys with minimal permissions:

```bash
# Create read-only key for analytics
b2 create-key --name analytics-ro --permissions=readFiles bucket-name

# Create write-only key for uploads
b2 create-key --name uploader --permissions=writeFiles bucket-name
```

### 2. Rotate Keys Regularly

```bash
# Create new key
b2 create-key --name careflow-2024 --permissions=readFiles,writeFiles bucket-name

# Update environment variables

# Delete old key (after verification)
b2 delete-key --key-id 004xxxxxxxxx
```

### 3. Enable 2FA

1. Go to Account Settings
2. Click **Security** > **Two-Factor Authentication**
3. Enable for all operations

## Troubleshooting

### "Access Denied" Error

**Cause**: Incorrect credentials or insufficient permissions

**Solution**:
1. Verify `BACKBLAZE_KEY_ID` and `BACKBLAZE_APPLICATION_KEY`
2. Check key has correct permissions
3. Ensure bucket name matches exactly

### "No Such Bucket" Error

**Cause**: Bucket doesn't exist or wrong name

**Solution**:
1. Verify bucket name in Backblaze Console
2. Check bucket wasn't deleted
3. Ensure correct account

### Slow Upload Speeds

**Cause**: Network or location issues

**Solution**:
1. Use region closest to your users
2. Enable server-side encryption
3. Use multipart upload for large files

### CORS Errors

**Cause**: Browser blocked request

**Solution**:
1. Add domain to CORS rules
2. Check allowed methods match
3. Verify allowed origins

## Support

- [Backblaze B2 Documentation](https://www.backblazeb2.com/docs)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3)
- [Backblaze Community Forum](https://www.backblazeb2.com/discord)

---

## Quick Reference

### Commands

```bash
# Install b2 CLI
pip install b2

# Authenticate
b2 authorize_account <KEY_ID> <APPLICATION_KEY>

# List buckets
b2 list-buckets

# Upload file
b2 upload-file --progress bucket-name filename file-name

# Download file
b2 download-file-by-id bucket-name file-id filename

# List files
b2 list-file-versions bucket-name

# Delete file
b2 delete-file-version bucket-name file-id
```

### Environment Variables

```bash
BACKBLAZE_KEY_ID=004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BACKBLAZE_APPLICATION_KEY=Kxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BACKBLAZE_BUCKET_NAME=careflow-recordings-prod
BACKBLAZE_ENDPOINT=https://s3.us-east-1.backblazeb2.com
BACKBLAZE_REGION=us-east-1
```

### Related Documents

- [System Architecture](../SYSTEM_ARCHITECTURE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Recording Model](../../models/Recording.js)
- [Backblaze Storage Library](../../lib/backblaze.js)
