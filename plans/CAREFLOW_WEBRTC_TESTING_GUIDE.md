# CareFlow WebRTC Calling Flow - Testing Guide

## Test Environment Setup

### Prerequisites

- Node.js installed (v18+)
- CareFlow application running locally
- Browser with DevTools (Chrome/Firefox recommended)
- Network tab filtering enabled for SignalR

### Starting the Application

```bash
cd /Users/eugenemutai/Development/CareFlow
npm run dev
# or
yarn dev
```

---

## Section 1: DialPad State Management Tests

### Test 1.1: Single Digit Entry

**Objective:** Verify pressing a single digit updates the input exactly once

**Steps:**

1. Open browser DevTools → Console tab
2. Navigate to Dashboard → DialerTab
3. Press digit "3" on the dialpad
4. Observe input field

**Expected Results:**

- Input displays exactly "3" (no duplication)
- Console shows no React warnings about simultaneous state updates
- No flickering or jumping in the input field

**Code Verification:**

- `DialPad.js:71` - `activeSetPhoneNumber((prev) => (prev || "") + digit)` called once
- `DialerTab.jsx:22-23` - `dialedNumber` state updated once

### Test 1.2: Multiple Sequential Digits

**Objective:** Verify pressing digits sequentially accumulates correctly

**Steps:**

1. Press "5" then "5" then "5"
2. Verify input shows "555"
3. Press "1", "2", "3"
4. Verify input shows "555123"

**Expected Results:**

- Input shows exactly the sequence pressed
- No characters are duplicated or skipped
- Rapid pressing works without state corruption

### Test 1.3: Rapid Digit Entry

**Objective:** Test high-frequency digit input (5+ digits/second)

**Steps:**

1. Press digits as rapidly as possible (simulating 5+ dps)
2. Count the digits entered vs displayed
3. Verify no characters are dropped or duplicated

**Expected Results:**

- All entered digits are displayed
- No race conditions or state corruption
- Input reflects exactly what was pressed

### Test 1.4: Backspace Functionality

**Objective:** Verify backspace removes exactly one character

**Steps:**

1. Enter "555123"
2. Press backspace once
3. Verify input shows "55512"
4. Press backspace 3 more times
5. Verify input shows "55"

**Expected Results:**

- Each backspace removes exactly one character
- Backspace on empty string has no effect
- No character duplication occurs

**Code Verification:**

- `DialPad.js:83-85` - `activeSetPhoneNumber((prev) => (prev || "").slice(0, -1))`

### Test 1.5: Clear Functionality

**Objective:** Verify clear button empties the input

**Steps:**

1. Enter any phone number
2. Press "Clear" button
3. Verify input is empty ("")
4. Verify digit count shows 0

**Expected Results:**

- Input field is completely cleared
- No residual characters remain
- State is reset to empty string

---

## Section 2: Call Connection Flow Tests

### Test 2.1: Call Initiation

**Objective:** Verify call button initiates connection flow correctly

**Steps:**

1. Enter a valid phone number (e.g., "+1234567890")
2. Click "Make Call" button
3. Monitor call status indicator
4. Observe state transitions

**Expected Results:**

- Status transitions: idle → connecting → ringing → connected
- Dialed number is preserved during connection
- No errors in console

**Code Verification:**

- `DialerTab.jsx:25-30` - `handleMakeCall` uses `dialedNumber`
- `hooks/useCallManager.js:195-229` - `makeCall` function
- `components/dashboard/CallControls.js:162-169` - Call button triggers `onCall`

### Test 2.2: Call with Invalid Number

**Objective:** Verify error handling for invalid phone numbers

**Steps:**

1. Enter an invalid phone number
2. Click "Make Call"
3. Observe error handling
4. Verify number remains for retry

**Expected Results:**

- Appropriate error message displayed
- Call status returns to idle
- Phone number remains in input for retry
- No application crashes

### Test 2.3: Preserved Number During Connection

**Objective:** Verify dialed number stays displayed during connection

**Steps:**

1. Enter phone number
2. Click "Make Call"
3. While connecting, verify input still shows number
4. Verify number is not cleared prematurely

**Expected Results:**

- Phone number remains visible during connection
- Input is not cleared until call ends or user clears it

### Test 2.4: Call Retry After Failure

**Objective:** Verify easy retry after failed call

**Steps:**

1. Attempt call with invalid number (fails)
2. Verify number is still in input
3. Fix the number
4. Click "Make Call" again

**Expected Results:**

- Previous (invalid) number is still in input
- User can edit and retry without re-entering

---

## Section 3: Call Termination Tests

### Test 3.1: Hangup During Connected Call

**Objective:** Verify clean state transition on hangup

**Steps:**

1. Establish a connected call
2. Click "End Call" button
3. Monitor state transitions
4. Verify dialed number handling

**Expected Results:**

- Status transitions: connected → disconnected → idle
- Dialed number is cleared
- No orphaned call state

**Code Verification:**

- `DialerTab.jsx:36-39` - `handleHangup` clears `dialedNumber`
- `hooks/useCallManager.js:231-235` - `hangupCall` + `resetCallState`
- `hooks/useCallState.js:35-43` - `resetCallState` clears all call state

### Test 3.2: Hangup During Connecting Phase

**Objective:** Verify clean cancellation during connection

**Steps:**

1. Initiate a call
2. Before connection, click "End Call"
3. Verify state resets correctly

**Expected Results:**

- Status returns to idle
- Timer stops (if started)
- No errors thrown

### Test 3.3: Remote Hangup (Simulated)

**Objective:** Verify UI handles remote call termination

**Steps:**

1. Establish connected call
2. Simulate remote hangup (via signaling)
3. Verify UI updates to idle state

**Expected Results:**

- Call status updates to "disconnected" then "idle"
- UI controls update accordingly

---

## Section 4: SignalR Integration Tests

### Test 4.1: Signaling Traffic Capture

**Objective:** Verify SignalR traffic is captured in DevTools

**Steps:**

1. Open DevTools → Network tab
2. Filter by "SignalR" or "hub"
3. Initiate a call
4. Observe outgoing messages

**Expected Results:**

- SignalR requests visible in Network tab
- WebRTC signaling messages transmitted

### Test 4.2: Offer/Answer Exchange

**Objective:** Verify WebRTC offer/answer signaling

**Steps:**

1. Set up call between two parties
2. Monitor signaling messages
3. Verify offer → answer → ICE candidates flow

**Expected Results:**

- Caller sends offer
- Callee receives offer
- Callee sends answer
- Both exchange ICE candidates

### Test 4.3: ICE Candidate Exchange

**Objective:** Verify ICE candidates are transmitted

**Steps:**

1. During call setup, monitor signaling
2. Verify ICE candidate messages
3. Verify peer connection establishment

**Expected Results:**

- Multiple ICE candidate messages transmitted
- Peer connection eventually connected

### Test 4.4: Hangup Signaling

**Objective:** Verify hangup signal is transmitted

**Steps:**

1. Establish connected call
2. End call via hangup button
3. Monitor signaling for hangup message
4. Verify remote party receives hangup

**Expected Results:**

- Hangup signal transmitted via SignalR
- Remote party transitions to idle
- No orphaned call state on remote side

---

## Section 5: Edge Cases and Error Handling

### Test 5.1: Empty Input Call Attempt

**Objective:** Verify proper handling of empty number

**Steps:**

1. Ensure input is empty
2. Click "Make Call"

**Expected Results:**

- Error message: "Phone number is required"
- No API call made
- Status remains idle

### Test 5.2: Special Characters Input

**Objective:** Verify dialpad handles special characters (\*, #)

**Steps:**

1. Press "\*" then "#"
2. Verify input shows "\*#"
3. Press "0" with "+" modifier

**Expected Results:**

- Special characters are appended correctly
- No validation errors during entry

### Test 5.3: Maximum Length Handling

**Objective:** Verify input length limits

**Steps:**

1. Enter more than 15 characters (E.164 max)
2. Verify behavior

**Expected Results:**

- Input accepts up to 15 characters (configurable)
- No truncation errors

---

## Section 6: React Console Warning Verification

### Test 6.1: No Controlled Input Warnings

**Objective:** Verify no "uncontrolled to controlled" warnings

**Steps:**

1. Open DevTools Console
2. Perform all dialpad operations
3. Monitor for React warnings

**Expected Results:**

- No warnings about input value switching from undefined to defined
- No warnings about controlled/uncontrolled input

**Code Verification:**

- `DialPad.js:46-47` - Always provides fallback `|| ""`
- `DialPad.js:42` - Local state initialized with fallback

### Test 6.2: No State Update Warnings

**Objective:** Verify no "cannot update during render" warnings

**Steps:**

1. Perform rapid operations
2. Monitor for update warnings

**Expected Results:**

- No React state update warnings
- All updates happen in event handlers or effects

---

## Test Results Documentation Template

| Test ID | Test Name       | Expected            | Actual | Status     | Notes |
| ------- | --------------- | ------------------- | ------ | ---------- | ----- |
| 1.1     | Single Digit    | Input: "3"          |        | ⏳ Pending |       |
| 1.2     | Multiple Digits | Input: "555123"     |        | ⏳ Pending |       |
| 1.3     | Rapid Entry     | All digits captured |        | ⏳ Pending |       |
| 1.4     | Backspace       | Removes 1 char      |        | ⏳ Pending |       |
| 1.5     | Clear           | Empty input         |        | ⏳ Pending |       |
| 2.1     | Call Init       | Status transitions  |        | ⏳ Pending |       |
| 2.2     | Invalid Call    | Error shown         |        | ⏳ Pending |       |
| 3.1     | Hangup          | Clean state         |        | ⏳ Pending |       |
| 4.1     | SignalR         | Traffic captured    |        | ⏳ Pending |       |
| 6.1     | No Warnings     | Clean console       |        | ⏳ Pending |       |

---

## Known Issues and Limitations

1. **Maximum Length**: Input does not enforce 15-character E.164 limit - consider adding `maxLength={15}` to input
2. **DTMF**: Sending DTMF tones during call requires additional implementation
3. **SignalR Reconnection**: Auto-reconnection after network loss not implemented

---

## Summary of Code Changes

### Files Modified:

1. **components/dashboard/DialPad.js**
   - Line 46-47: Added `|| ""` fallback for controlled input
   - Line 67-78: Fixed duplicate state update by checking `!setPhoneNumber` before calling `onDigitPress`

2. **app/dashboard/tabs/DialerTab.jsx**
   - Added `dialedNumber` state (line 22-23)
   - Added `handleMakeCall` callback (line 25-30)
   - Added `handleHangup` callback with `dialedNumber` clear (line 36-39)
   - Updated DialPad props to use controlled pattern (line 96-100)

### Key Fix: Double Digit Issue

The root cause was that `handleDigitPress` in DialPad was calling both:

1. `activeSetPhoneNumber((prev) => (prev || "") + digit)`
2. `onDigitPress(digit)` which also called `setDialedNumber`

This caused `setDialedNumber` to be invoked twice per key press. Fixed by only calling `onDigitPress` when `setPhoneNumber` is not provided (local state mode).
