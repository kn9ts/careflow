# CareFlow API Documentation

**Last Updated:** 2026-02-06
**Version:** 1.0.0

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Recording Endpoints](#recording-endpoints)
3. [Call Endpoints](#call-endpoints)
4. [User Endpoints](#user-endpoints)
5. [Webhook Endpoints](#webhook-endpoints)
6. [Analytics Endpoints](#analytics-endpoints)
7. [Token Endpoints](#token-endpoints)
8. [Notification Endpoints](#notification-endpoints)
9. [Error Codes](#error-codes)

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user or return existing user profile.

**Request Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |

**Request Body:**

```json
{
  "displayName": "John Doe",
  "email": "john@example.com",
  "firebaseUid": "firebase-uid-123"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User profile created successfully",
  "data": {
    "id": "user-id-123",
    "email": "john@example.com",
    "displayName": "John Doe",
    "role": "user",
    "care4wId": "care4w-1000001",
    "twilioClientIdentity": "careflow-user-123",
    "createdAt": "2026-02-06T12:00:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Missing required fields: displayName, email, firebaseUid",
  "code": "VALIDATION_ERROR"
}
```

---

### POST /api/auth/login

Authenticate user with Firebase token.

**Request Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/json |

**Request Body:**

```json
{
  "idToken": "firebase-id-token-123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id-123",
      "email": "john@example.com",
      "displayName": "John Doe",
      "care4wId": "care4w-1000001"
    }
  }
}
```

---

### POST /api/auth/logout

Sign out the current user.

**Request Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Recording Endpoints

### GET /api/recordings

List recordings with pagination and filters.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| type | string | - | Filter by type (`call`, `voicemail`) |
| direction | string | - | Filter by direction (`inbound`, `outbound`) |
| status | string | - | Filter by status |
| startDate | string | - | Filter recordings from date |
| endDate | string | - | Filter recordings until date |
| sortBy | string | `recordedAt` | Sort field |
| sortOrder | string | `desc` | Sort order (`asc`, `desc`) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recordings": [
      {
        "id": "recording-id-123",
        "type": "call",
        "callMode": "twilio",
        "from": "+1234567890",
        "to": "+0987654321",
        "direction": "outbound",
        "duration": 120,
        "fileSize": 1048576,
        "format": "webm",
        "recordedAt": "2026-02-06T12:00:00.000Z",
        "status": "active",
        "isListened": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### GET /api/recordings/[id]

Get a specific recording by ID.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "recording-id-123",
    "type": "call",
    "callMode": "twilio",
    "from": "+1234567890",
    "to": "+0987654321",
    "direction": "outbound",
    "duration": 120,
    "fileSize": 1048576,
    "format": "webm",
    "recordedAt": "2026-02-06T12:00:00.000Z",
    "status": "active",
    "transcription": {
      "status": "completed",
      "text": "Hello, this is a call recording...",
      "confidence": 0.95,
      "language": "en"
    }
  }
}
```

---

### POST /api/recordings/upload

Upload a new recording.

**Request Headers:**
| Header | Value |
|--------|-------|
| Content-Type | multipart/form-data |

**Request Body (Form Data):**
| Field | Type | Description |
|-------|------|-------------|
| file | File | Audio file |
| type | string | Recording type (`call`, `voicemail`) |
| from | string | Caller phone number |
| to | string | Recipient phone number |
| direction | string | Call direction (`inbound`, `outbound`) |
| duration | number | Duration in seconds |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Recording uploaded successfully",
  "data": {
    "id": "recording-id-123",
    "storageProvider": "backblaze",
    "fileKey": "recordings/2026/02/06/firebase-uid-123/recording-id-123.webm"
  }
}
```

---

### DELETE /api/recordings/[id]

Delete a recording.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Recording deleted successfully"
}
```

---

## Call Endpoints

### GET /api/calls/history

Get call history.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| startDate | string | Filter from date |
| endDate | string | Filter until date |
| direction | string | Filter by direction |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call-id-123",
        "from": "+1234567890",
        "to": "+0987654321",
        "direction": "outbound",
        "status": "completed",
        "duration": 120,
        "recordedAt": "2026-02-06T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

### GET /api/calls/[id]

Get details of a specific call.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "call-id-123",
    "from": "+1234567890",
    "to": "+0987654321",
    "direction": "outbound",
    "status": "completed",
    "duration": 120,
    "recording": {
      "id": "recording-id-123",
      "url": "/api/recordings/recording-id-123/url"
    },
    "startedAt": "2026-02-06T12:00:00.000Z",
    "endedAt": "2026-02-06T12:02:00.000Z"
  }
}
```

---

## User Endpoints

### GET /api/users/lookup

Look up user by care4wId.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| care4wId | string | The CareFlow ID to look up |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "care4wId": "care4w-1000001",
    "displayName": "John Doe",
    "isOnline": true
  }
}
```

---

## Webhook Endpoints

### POST /api/webhooks/twilio/voice

Handle Twilio voice webhooks (incoming calls).

**Request Headers:**
| Header | Value |
|--------|-------|
| Content-Type | application/x-www-form-urlencoded |

**Request Body:**

```
To=+1234567890
From=+0987654321
CallSid=CA1234567890abcdef
CallStatus=ringing
```

**Response (TwiML):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Welcome to CareFlow. Please leave a message after the tone.</Say>
  <Record maxLength="300" action="/api/webhooks/twilio/voicemail" />
</Response>
```

---

### POST /api/webhooks/twilio/status

Handle Twilio call status webhooks.

**Request Body:**

```
CallSid=CA1234567890abcdef
CallStatus=completed
CallDuration=120
RecordingSid=RE1234567890abcdef
RecordingUrl=https://api.twilio.com/recordings/RE123...
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Status webhook received"
}
```

---

### POST /api/webhooks/twilio/voicemail

Handle Twilio voicemail webhooks.

**Request Body:**

```
CallSid=CA1234567890abcdef
RecordingSid=RE1234567890abcdef
RecordingDuration=45
RecordingUrl=https://api.twilio.com/recordings/RE123...
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Voicemail recording processed"
}
```

---

## Analytics Endpoints

### GET /api/analytics

Get call analytics for the authenticated user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (ISO 8601) |
| endDate | string | End date (ISO 8601) |
| groupBy | string | Group by (`day`, `week`, `month`) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalCalls": 150,
    "totalDuration": 18000,
    "averageDuration": 120,
    "inboundCalls": 80,
    "outboundCalls": 70,
    "voicemailCount": 10,
    "byDay": [
      {
        "date": "2026-02-06",
        "calls": 15,
        "duration": 1800
      }
    ],
    "byDirection": {
      "inbound": {
        "count": 80,
        "totalDuration": 9600
      },
      "outbound": {
        "count": 70,
        "totalDuration": 8400
      }
    }
  }
}
```

---

## Token Endpoints

### GET /api/token

Get Twilio capability token.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "identity": "careflow-user-123",
    "expiresIn": 3600
  }
}
```

---

## Notification Endpoints

### POST /api/notifications/register

Register a Firebase Cloud Messaging token for push notifications.

**Request Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {firebaseIdToken} |
| Content-Type | application/json |

**Request Body:**

```json
{
  "fcmToken": "fcm-token-123",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0",
    "platform": "iOS",
    "language": "en"
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification token registered successfully",
  "data": {
    "tokenCount": 2
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "FCM token is required",
  "code": "MISSING_FCM_TOKEN"
}
```

---

### DELETE /api/notifications/unregister

Unregister a Firebase Cloud Messaging token.

**Request Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {firebaseIdToken} |
| Content-Type | application/json |

**Request Body:**

```json
{
  "fcmToken": "fcm-token-123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Notification token unregistered successfully",
  "data": {
    "tokenCount": 1
  }
}
```

---

## Error Codes

| Code                    | HTTP Status | Description                           |
| ----------------------- | ----------- | ------------------------------------- |
| VALIDATION_ERROR        | 400         | Missing or invalid request parameters |
| UNAUTHORIZED            | 401         | Authentication required or invalid    |
| FORBIDDEN               | 403         | Insufficient permissions              |
| NOT_FOUND               | 404         | Resource not found                    |
| RATE_LIMITED            | 429         | Too many requests                     |
| INTERNAL_ERROR          | 500         | Server error                          |
| AUTH_REGISTER_FAILED    | 500         | User registration failed              |
| RECORDING_UPLOAD_FAILED | 500         | Recording upload failed               |
| TOKEN_GENERATION_FAILED | 500         | Token generation failed               |

---

## Authentication

All protected endpoints require authentication via:

1. **Bearer Token**: Include `Authorization: Bearer {token}` header
2. **Firebase ID Token**: For user authentication

---

## Rate Limiting

- API calls are limited to 100 requests per minute per user
- Recording uploads are limited to 10 per hour per user

---

## Versioning

API versioning is handled via URL path:

- Current version: `/api/v1/*` (implicit)
- Future versions will use `/api/v2/*`

---

Last updated: February 2026
CareFlow v1.0.0
