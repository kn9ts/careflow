---

# CareFlow System Architecture (Concise)

## Overview

CareFlow is a Next.js application using Twilio Voice for browser calling, Firebase Auth for authentication, and MongoDB for persistence.

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client
        A[Next.js UI] --> B[AuthContext]
        B --> C[Dashboard]
        C --> D[Twilio Device SDK]
    end

    subgraph API
        E[App Router API] --> F[Auth Handlers]
        E --> G[Call History]
        E --> H[Analytics]
        E --> I[Twilio Webhooks]
    end

    subgraph Services
        J[Firebase Auth]
        K[MongoDB]
        L[Twilio Voice]
        M[Firebase Storage]
    end

    A --> E
    F --> J
    G --> K
    H --> K
    I --> L
    D --> L
    C --> M
```

## Key Data Flows

### Incoming Call Flow

```mermaid
sequenceDiagram
    participant Caller
    participant Twilio
    participant API
    participant Browser

    Caller->>Twilio: Dials Twilio number
    Twilio->>API: POST /api/webhooks/twilio/voice
    API->>Twilio: TwiML Dial Client
    Twilio->>Browser: Incoming call event
    Browser->>Twilio: Accept call
    Twilio->>Caller: Connected
```

### Outgoing Call Flow

```mermaid
sequenceDiagram
    participant Browser
    participant API
    participant Twilio
    participant Recipient

    Browser->>API: GET /api/token
    API->>Twilio: Token grant
    Browser->>Twilio: Connect call
    Twilio->>Recipient: PSTN call
    Recipient->>Twilio: Answer
    Twilio->>Browser: Connected
```

## Relevant Modules

- API route handlers in [`careflow/app/api`](careflow/app/api)
- Authentication context in [`careflow/context/AuthContext.js`](careflow/context/AuthContext.js)
- Twilio integration in [`careflow/lib/twilio.js`](careflow/lib/twilio.js)
- Database layer in [`careflow/lib/db.js`](careflow/lib/db.js)

## Server vs Client

- **Server**: Route handlers, token generation, database access.
- **Client**: Dashboard UI, Twilio Device, call controls.

## Key Components

- Dashboard page in [`careflow/app/dashboard/page.js`](careflow/app/dashboard/page.js)
- Protected routes in [`careflow/components/ProtectedRoute/ProtectedRoute.js`](careflow/components/ProtectedRoute/ProtectedRoute.js)
- Call status UI in [`careflow/components/dashboard/CallStatus.js`](careflow/components/dashboard/CallStatus.js)

## Security Notes

- Server-side credentials only for Twilio and Firebase Admin.
- Require Firebase ID token validation for protected APIs.
- Validate webhook signatures for Twilio callbacks.

## Environment Variables

See [`careflow/.env.local.example`](careflow/.env.local.example).
