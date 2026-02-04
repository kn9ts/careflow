# CareFlow User Flows (Concise)

## Overview

Core user journeys for authentication and calling. Diagrams reflect the target flow (some steps are pending implementation, see analysis report).

---

## Authentication

### Login

```mermaid
graph TD
    A[Visit app] --> B{Authenticated?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Login form]
    D --> E[Firebase Auth]
    E -->|Success| C
    E -->|Error| D
```

### Registration

```mermaid
graph TD
    A[Sign up] --> B[Firebase Auth create user]
    B --> C[POST /api/auth/register]
    C --> D[Dashboard]
```

### Password Reset

```mermaid
graph TD
    A[Forgot password] --> B[Enter email]
    B --> C[Firebase reset email]
    C --> D[Back to login]
```

---

## Calling

### Outbound Call

```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant Twilio
    participant PSTN

    User->>App: Enter number
    App->>API: GET /api/token
    API->>Twilio: Create token
    App->>Twilio: Device.connect
    Twilio->>PSTN: Dial
    PSTN-->>Twilio: Answer
    Twilio-->>App: Connected
```

### Inbound Call

```mermaid
sequenceDiagram
    participant Caller
    participant Twilio
    participant Webhook
    participant App

    Caller->>Twilio: Call number
    Twilio->>Webhook: POST /api/webhooks/twilio/voice
    Webhook->>Twilio: TwiML Dial Client
    Twilio->>App: Incoming call
    App->>Twilio: Accept
```

### Call History

```mermaid
graph TD
    A[Open History] --> B[GET /api/calls/history]
    B --> C[MongoDB query]
    C --> D[Render list]
```

---

## Components Involved

- Login: [`careflow/app/login/page.js`](careflow/app/login/page.js)
- Signup: [`careflow/app/signup/page.js`](careflow/app/signup/page.js)
- Dashboard: [`careflow/app/dashboard/page.js`](careflow/app/dashboard/page.js)
- Auth state: [`careflow/context/AuthContext.js`](careflow/context/AuthContext.js)
- Webhooks: [`careflow/app/api/webhooks/twilio/voice/route.js`](careflow/app/api/webhooks/twilio/voice/route.js)

## Application Initialization Flow

```mermaid
graph TD
    A[Application Start] --> B[Import initialization modules]
    B --> C[Auto-initialize on server side]
    C --> D[Client-side initialization check]

    D --> E[Load environment configuration]
    E --> F[Validate configuration schema]
    F --> G{Validation successful?}

    G -->|No| H[Log validation errors]
    G -->|Yes| I[Set up global application state]

    H --> J{Environment: Development?}
    J -->|Yes| K[Show detailed errors]
    J -->|No| L[Continue with warnings]

    K --> M[Fail fast in production]
    L --> N[Continue initialization]
    M --> O[Exit application]

    I --> N
    N --> P[Initialize service configurations]
    P --> Q[Set up environment-specific features]

    Q --> R{Environment: Development?}
    R -->|Yes| S[Enable development features]
    R -->|Production| T[Enable production features]
    R -->|Test| U[Enable test features]

    S --> V[Set up monitoring]
    T --> V
    U --> V

    V --> W[Mark initialization complete]
    W --> X[Application ready]

    X --> Y[Render application components]
    Y --> Z[User interaction begins]
```

**Initialization Phases:**

### Phase 1: Configuration Loading

1. **Environment Detection**: Determine development/production/test environment
2. **File Loading**: Load `.env.local` configuration file
3. **Schema Validation**: Validate all required environment variables
4. **Type Casting**: Convert configuration values to proper types

### Phase 2: Service Setup

1. **Global State**: Set up application metadata and service configurations
2. **Service Validation**: Verify all required services are configured
3. **Error Handling**: Handle missing or invalid configurations appropriately

### Phase 3: Environment Configuration

1. **Development**: Enable verbose logging, hot reload, development middleware
2. **Production**: Enable security features, compression, rate limiting
3. **Test**: Enable mocking, silent logging, fast timeouts

### Phase 4: Monitoring Setup

1. **Status Monitoring**: Initialize initialization status components
2. **Error Tracking**: Set up error monitoring and reporting
3. **Performance Monitoring**: Configure performance tracking

---

## Call Management Flows

### Making a Call

```mermaid
graph TD
    A[User on Dashboard] --> B[Enters phone number]
    B --> C[Clicks 'Call' button]
    C --> D[Validate phone number]
    D -->|Invalid| E[Show validation error]
    D -->|Valid| F[Initiate call request]

    F --> G[Generate Twilio access token]
    G --> H[Create Twilio Voice connection]
    H --> I[Establish WebRTC connection]

    I --> J{Connection successful?}
    J -->|No| K[Show connection error]
    J -->|Yes| L[Call connected]

    L --> M[Display call interface]
    M --> N[Show call controls]
    N --> O[Monitor call status]

    O --> P{Call active?}
    P -->|Yes| Q[Continue monitoring]
    P -->|No| R[Handle call end]

    Q --> O
    R --> S[Log call details]
    S --> T[Update call history]

    E --> B
    K --> B
```

**Call Process Details:**

1. **Number Input**: User enters destination phone number
2. **Validation**: Client-side and server-side number validation
3. **Token Generation**: Secure Twilio access token creation
4. **Connection**: WebRTC connection establishment
5. **Call Management**: Real-time call status monitoring
6. **Call Logging**: Automatic call history updates

**Security Measures:**

- Phone number format validation
- Secure token generation with expiration
- Connection encryption via WebRTC
- Call logging for audit trails

---

### Receiving a Call

```mermaid
graph TD
    A[Twilio webhook receives call] --> B[Parse call data]
    B --> C[Validate call source]
    C --> D[Check user availability]

    D --> E{User available?}
    E -->|No| F[Send to voicemail]
    E -->|Yes| G[Generate access token]

    G --> H[Send push notification]
    H --> I[User receives notification]
    I --> J[User accepts call]

    J --> K[Establish WebRTC connection]
    K --> L[Call connected]
    L --> M[Monitor call status]

    M --> N{Call active?}
    N -->|Yes| O[Continue monitoring]
    N -->|No| P[Handle call end]

    P --> Q[Log call details]
    Q --> R[Update call history]

    F --> S[Store voicemail]
    S --> T[Notify user of missed call]
```

**Receiving Process:**

1. **Call Detection**: Twilio webhook detects incoming call
2. **Validation**: Verify call source and user availability
3. **Notification**: Push notification to user's browser
4. **Acceptance**: User accepts or declines call
5. **Connection**: WebRTC connection establishment
6. **Monitoring**: Real-time call status tracking

**Features:**

- Push notifications for incoming calls
- User availability checking
- Voicemail system for unavailable users
- Call logging and history updates

---

### Call History Access

```mermaid
graph TD
    A[User clicks 'History'] --> B[Check authentication]
    B --> C{User authenticated?}
    C -->|No| D[Redirect to login]
    C -->|Yes| E[Fetch call history]

    E --> F[Call API endpoint]
    F --> G[Validate user permissions]
    G --> H[Query database]

    H --> I[Format call data]
    I --> J[Return call history]
    J --> K[Display call list]

    K --> L[User views call details]
    L --> M[Optional: Filter calls]
    M --> N[Optional: Export data]

    D --> O[Login form loads]
    O --> P[User logs in]
    P --> Q[Return to history]
```

**History Features:**

1. **Authentication Required**: Only authenticated users can access history
2. **Permission Validation**: Verify user can access requested data
3. **Data Formatting**: Format raw call data for display
4. **Filtering Options**: Filter by date, call type, duration
5. **Export Capabilities**: Export call history to various formats

---

## System Architecture Flow

```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js Application] --> B[React Components]
        B --> C[AuthContext Provider]
        C --> D[Protected Routes]
        D --> E[Call Interface]
    end

    subgraph "Authentication Layer"
        F[Firebase Auth] --> G[User Management]
        G --> H[Token Validation]
        H --> I[Session Management]
    end

    subgraph "API Layer"
        J[Next.js API Routes] --> K[Auth Endpoints]
        K --> L[Call Endpoints]
        L --> M[History Endpoints]
    end

    subgraph "Service Layer"
        N[Twilio API] --> O[Voice Services]
        O --> P[Call Management]
        P --> Q[Webhook Handling]

        R[Firebase Storage] --> S[Recording Storage]
        S --> T[File Management]

        U[MongoDB] --> V[User Data]
        V --> W[Call History]
        W --> X[Analytics Data]
    end

    subgraph "Configuration Layer"
        Y[Environment Config] --> Z[Validation System]
        Z --> AA[Service Dependencies]
        AA --> BB[Initialization Monitor]
    end

    A --> F
    A --> J
    C --> F
    E --> N
    E --> R
    K --> U
    L --> N
    M --> U
    Y --> J
    Y --> K
    Y --> L
    Y --> M
```

**Architecture Components:**

### Client Layer

- **Next.js Application**: Main application framework
- **React Components**: User interface components
- **AuthContext**: Authentication state management
- **Protected Routes**: Route-level authentication

### Authentication Layer

- **Firebase Auth**: User authentication and authorization
- **Token Management**: JWT token handling and validation
- **Session Management**: User session persistence

### API Layer

- **Next.js API Routes**: Server-side API endpoints
- **Auth Endpoints**: Authentication-related APIs
- **Call Endpoints**: Voice call management APIs
- **History Endpoints**: Call history and analytics APIs

### Service Layer

- **Twilio API**: Voice call services and WebRTC
- **Firebase Storage**: Call recording storage
- **MongoDB**: Database for user and call data

### Configuration Layer

- **Environment Config**: Dynamic configuration loading
- **Validation System**: Configuration validation and type casting
- **Service Dependencies**: Service availability checking
- **Initialization Monitor**: Application startup monitoring

---

## Error Handling Flow

```mermaid
graph TD
    A[Error Occurs] --> B[Error Type Detection]
    B --> C{Error Category}

    C -->|Authentication| D[Auth Error Handler]
    C -->|Network| E[Network Error Handler]
    C -->|Validation| F[Validation Error Handler]
    C -->|System| G[System Error Handler]

    D --> H[Show auth-specific message]
    E --> I[Show network error message]
    F --> J[Show validation error message]
    G --> K[Show system error message]

    H --> L[Log error details]
    I --> L
    J --> L
    K --> L

    L --> M[User feedback displayed]
    M --> N[Continue or retry]

    N -->|Retry| O[Attempt recovery]
    N -->|Continue| P[Graceful degradation]

    O --> Q{Recovery successful?}
    Q -->|Yes| R[Resume normal operation]
    Q -->|No| S[Escalate error]

    S --> T[Show critical error]
    T --> U[Application state preserved]
```

**Error Categories:**

1. **Authentication Errors**: Login failures, session timeouts, token issues
2. **Network Errors**: API failures, connection timeouts, service unavailability
3. **Validation Errors**: Input validation failures, configuration errors
4. **System Errors**: Database errors, service failures, critical system issues

**Error Response Strategy:**

- User-friendly error messages
- Detailed logging for debugging
- Graceful degradation when possible
- Recovery attempts for transient errors
- Critical error escalation procedures

---

## Performance Monitoring Flow

```mermaid
graph TD
    A[Application Start] --> B[Initialize Monitoring]
    B --> C[Track Page Loads]
    C --> D[Track API Calls]
    D --> E[Track User Interactions]

    E --> F[Monitor Resource Usage]
    F --> G[Monitor Network Performance]
    G --> H[Monitor Error Rates]

    H --> I[Collect Metrics]
    I --> J[Analyze Performance]
    J --> K[Generate Reports]

    K --> L[Alert on Issues]
    L --> M[Optimize Performance]
    M --> N[Continuous Monitoring]

    N --> O[Performance Dashboard]
    O --> P[Developer Insights]
    P --> Q[User Experience Improvements]
```

**Monitoring Features:**

1. **Page Load Times**: Track initial load and navigation performance
2. **API Response Times**: Monitor backend API performance
3. **User Interaction Latency**: Track UI responsiveness
4. **Resource Usage**: Monitor memory and CPU usage
5. **Error Tracking**: Track and categorize application errors
6. **Performance Analytics**: Generate performance reports and insights

This comprehensive user flow documentation provides detailed insights into how users interact with CareFlow, the system architecture, and the various flows that ensure a smooth user experience.
