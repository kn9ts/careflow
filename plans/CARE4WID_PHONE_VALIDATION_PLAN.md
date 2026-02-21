# Plan: Sanitize and Validate care4wIds Differently from Phone Numbers

## Objective

Prevent 7-digit numbers from being treated as phone numbers to avoid conflicts with care4wId sequences.

## Background

### Current State

- **care4wId format**: `care4w-XXXXXXX` (e.g., `care4w-1000001`) - 7 digits after prefix
- **Phone validation**: `looksLikePhoneNumber()` accepts 7-15 digit numbers as potential phones
- **Conflict**: A user entering "1000001" gets treated as a phone number instead of a care4wId

### Proposed Change

Modify `looksLikePhoneNumber()` in `lib/phoneUtils.js` to exclude 7-digit numbers, requiring at least 8 digits for phone number validation.

## Implementation Steps

### Step 1: Update phoneUtils.js

- Modify the `looksLikePhoneNumber()` function to change the minimum digit count from 7 to 8
- Current pattern: `/^\+?\d{7,15}$/`
- New pattern: `/^\+?\d{8,15}$/`

### Step 2: Test Validation

- Verify 7-digit care4wId sequences are not treated as phone numbers
- Verify 8+ digit phone numbers still work correctly

## Files to Modify

- `lib/phoneUtils.js` - Update `looksLikePhoneNumber()` function
