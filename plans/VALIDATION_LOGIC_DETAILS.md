# Full Validation Logic for care4wId vs Phone Numbers

## Current State

### 1. care4wId Validation

**File:** `lib/careFlowIdValidator.js`

```javascript
export function isValidCare4wId(care4wId) {
  return /^care4w-\d{7}$/.test(care4wId);
}
// Valid:   care4w-1000001
// Invalid: 1000001, care4w-100000, care4w-abc
```

### 2. Phone Number Validation

**File:** `lib/phoneUtils.js`

```javascript
export function looksLikePhoneNumber(input) {
  const cleaned = input.replace(/[\s\-\(\)\.]/g, '');

  // PROBLEM: Current regex accepts 7-15 digits
  if (/^\+?\d{7,15}$/.test(cleaned)) {
    return true;
  }
  if (/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
    return true;
  }
  return false;
}
// Valid:   +254712345678, 254712345678, 712345678
// PROBLEM: 1000001 (7 digits) also returns true!
```

### 3. Call Routing Flow

**File:** `lib/callManager.js`

```javascript
async _determineCallMode(destination) {
  // Step 1: Check if it's a care4wId
  const isCareFlowId = isValidCare4wId(destination);

  if (isCareFlowId) {
    return 'webrtc';  // Free P2P call
  }

  // Step 2: Check if it's a phone number
  const isPhoneNumber = looksLikePhoneNumber(destination);

  if (isPhoneNumber) {
    return 'twilio';  // PSTN call
  }

  // Step 3: If neither, reject
  throw new Error('Invalid destination');
}
```

## The Problem

When user enters "1000001" (a care4wId sequence without prefix):

1. ❌ Not a valid care4wId (missing "care4w-" prefix)
2. ✅ Returns `true` for `looksLikePhoneNumber()` (7 digits matches `\d{7,15}`)
3. ❌ Incorrectly routes to Twilio instead of rejecting

## Proposed Solution

Update `looksLikePhoneNumber()` to require **minimum 8 digits**:

```javascript
// Change from: /^\+?\d{7,15}$/
// To:         /^\+?\d{8,15}$/
```

## Behavior After Fix

| Input          | care4wId Check | Phone Check   | Result        |
| -------------- | -------------- | ------------- | ------------- |
| care4w-1000001 | ✅ valid       | ❌            | WebRTC        |
| 1000001        | ❌             | ❌ (7 digits) | Rejected      |
| 10000012       | ❌             | ❌ (8 digits) | WebRTC lookup |
| +254712345678  | ❌             | ✅            | Twilio        |
| 712345678      | ❌             | ✅            | Twilio        |
