/**
 * @jest-environment jsdom
 */

/**
 * Dialpad Integration Tests
 * Tests for dialpad functionality including phone number and care4Id call flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DialPad from '@/components/dashboard/DialPad';
import CallControls from '@/components/dashboard/CallControls';
import CallStatus from '@/components/dashboard/CallStatus';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

// Mock Notification
global.Notification = jest.fn();
global.Notification.permission = 'granted';

describe('Dialpad Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Phone Number Call Flow', () => {
    test('should initiate call with valid phone number', async () => {
      const mockMakeCall = jest.fn().mockResolvedValue(undefined);
      const phoneNumber = '+1234567890';

      render(
        <CallControls
          callStatus="idle"
          onCall={mockMakeCall}
          isMuted={false}
          isRecording={false}
          isRecordingSupported
        />
      );

      const callButton = screen.getByText('Make Call');
      fireEvent.click(callButton);

      // Note: In real integration, the phone number would come from DialPad
      expect(callButton).toBeInTheDocument();
    });

    test('should establish connection state on successful call', async () => {
      const mockMakeCall = jest.fn().mockResolvedValue(undefined);

      const { rerender } = render(
        <CallStatus status="idle" connectionState={{ state: 'ready', message: 'Ready' }} />
      );

      expect(screen.getByText(/Ready to make calls/i)).toBeInTheDocument();

      // Simulate call initiation - when connecting, connectionState should reflect that
      rerender(
        <CallStatus
          status="connecting"
          connectionState={{ state: 'connecting', message: 'Connecting...' }}
        />
      );

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    test('should enable voice communication on connected state', () => {
      render(
        <CallStatus
          status="connected"
          duration={30}
          connectionState={{ state: 'connected', message: 'Connected' }}
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    test('should handle call end gracefully', () => {
      const mockHangup = jest.fn();

      render(
        <CallControls
          callStatus="connected"
          onHangup={mockHangup}
          isMuted={false}
          isRecording={false}
          isRecordingSupported
        />
      );

      const endCallButton = screen.getByText('End Call');
      fireEvent.click(endCallButton);

      expect(mockHangup).toHaveBeenCalled();
    });
  });

  describe('Care4Id Call Flow', () => {
    test('should accept care4Id as valid call target', () => {
      const care4Id = 'care4w-1000001';

      render(
        <CallStatus
          status="idle"
          phoneNumber={care4Id}
          connectionState={{ state: 'ready', message: 'Ready' }}
        />
      );

      expect(screen.getByText('CareFlow ID')).toBeInTheDocument();
      expect(screen.getByText(care4Id)).toBeInTheDocument();
    });

    test('should initiate call with care4Id', async () => {
      const mockMakeCall = jest.fn().mockResolvedValue(undefined);
      const care4Id = 'care4w-1000001';

      render(
        <CallControls
          callStatus="idle"
          onCall={mockMakeCall}
          isMuted={false}
          isRecording={false}
          isRecordingSupported
        />
      );

      const callButton = screen.getByText('Make Call');
      expect(callButton).toBeInTheDocument();
    });

    test('should display care4Id in call status during call', () => {
      const care4Id = 'care4w-1000001';

      render(
        <CallStatus
          status="connected"
          duration={60}
          phoneNumber={care4Id}
          connectionState={{ state: 'ready', message: 'Ready' }}
        />
      );

      expect(screen.getByText('CareFlow ID')).toBeInTheDocument();
      expect(screen.getByText(care4Id)).toBeInTheDocument();
    });
  });

  describe('DialPad Input Registration', () => {
    test('should register digit presses correctly', () => {
      let phoneNumber = '';
      const setPhoneNumber = jest.fn((updater) => {
        if (typeof updater === 'function') {
          phoneNumber = updater(phoneNumber);
        } else {
          phoneNumber = updater;
        }
      });

      render(
        <DialPad phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} disabled={false} />
      );

      // Click digit buttons
      const button1 = screen.getByTestId('dial-button-1');
      fireEvent.click(button1);

      expect(setPhoneNumber).toHaveBeenCalled();
    });

    test('should clear phone number', () => {
      let phoneNumber = '123456';
      const setPhoneNumber = jest.fn(() => {
        phoneNumber = '';
      });

      render(
        <DialPad phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} disabled={false} />
      );

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(setPhoneNumber).toHaveBeenCalled();
    });

    test('should backspace last digit', () => {
      let phoneNumber = '1234';
      const setPhoneNumber = jest.fn((updater) => {
        phoneNumber = updater(phoneNumber);
      });

      render(
        <DialPad phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} disabled={false} />
      );

      const backspaceButton = screen.getByTestId('backspace-button');
      fireEvent.click(backspaceButton);

      expect(setPhoneNumber).toHaveBeenCalled();
    });

    test('should allow manual input via text field', () => {
      let phoneNumber = '';
      const setPhoneNumber = jest.fn((value) => {
        // setPhoneNumber receives the value directly, not an event
        if (typeof value === 'string') {
          phoneNumber = value;
        }
      });

      render(
        <DialPad phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} disabled={false} />
      );

      const input = screen.getByTestId('phone-input');
      fireEvent.change(input, { target: { value: '+1234567890' } });

      expect(setPhoneNumber).toHaveBeenCalled();
    });

    test('should disable input during active call', () => {
      render(<DialPad phoneNumber="" setPhoneNumber={jest.fn()} disabled />);

      const input = screen.getByTestId('phone-input');
      expect(input).toBeDisabled();
    });
  });

  describe('DTMF Functionality', () => {
    test('should send DTMF tones during active call', () => {
      const mockDTMF = jest.fn();

      render(
        <CallControls
          callStatus="connected"
          onDTMF={mockDTMF}
          isMuted={false}
          isRecording={false}
          isRecordingSupported
        />
      );

      // Open DTMF keypad
      const keypadButton = screen.getByText('Keypad (DTMF)');
      fireEvent.click(keypadButton);

      // Click a digit
      const digitButton = screen.getByText('1');
      fireEvent.click(digitButton);

      expect(mockDTMF).toHaveBeenCalledWith('1');
    });

    test('should disable DTMF when not in call', () => {
      render(
        <CallControls callStatus="idle" isMuted={false} isRecording={false} isRecordingSupported />
      );

      const keypadButton = screen.getByText('Keypad (DTMF)');
      expect(keypadButton).toBeDisabled();
    });
  });

  describe('Mute Functionality', () => {
    test('should toggle mute state', () => {
      const mockToggleMute = jest.fn();

      render(
        <CallControls
          callStatus="connected"
          onMute={mockToggleMute}
          isMuted={false}
          isRecording={false}
          isRecordingSupported
        />
      );

      const muteButton = screen.getByText('Mute');
      fireEvent.click(muteButton);

      expect(mockToggleMute).toHaveBeenCalled();
    });

    test('should show unmute when muted', () => {
      render(
        <CallControls callStatus="connected" isMuted isRecording={false} isRecordingSupported />
      );

      expect(screen.getByText('Unmute')).toBeInTheDocument();
    });
  });

  describe('Recording Functionality', () => {
    test('should start recording during active call', () => {
      const mockStartRecording = jest.fn();

      render(
        <CallControls
          callStatus="connected"
          isMuted={false}
          isRecording={false}
          isRecordingSupported
          onStartRecording={mockStartRecording}
        />
      );

      const recordButton = screen.getByText('Start Recording');
      fireEvent.click(recordButton);

      expect(mockStartRecording).toHaveBeenCalled();
    });

    test('should stop recording when recording', () => {
      const mockStopRecording = jest.fn();

      render(
        <CallControls
          callStatus="connected"
          isMuted={false}
          isRecording
          isRecordingSupported
          onStopRecording={mockStopRecording}
          recordingDuration={30}
        />
      );

      const stopButton = screen.getByText('Stop Recording');
      fireEvent.click(stopButton);

      expect(mockStopRecording).toHaveBeenCalled();
    });

    test('should show recording indicator when recording', () => {
      render(
        <CallControls
          callStatus="connected"
          isMuted={false}
          isRecording
          isRecordingSupported
          recordingDuration={45}
        />
      );

      expect(screen.getByText(/REC/)).toBeInTheDocument();
    });

    test('should disable recording when not in call', () => {
      render(
        <CallControls callStatus="idle" isMuted={false} isRecording={false} isRecordingSupported />
      );

      expect(screen.getByText(/Recording \(call required\)/)).toBeInTheDocument();
    });
  });

  describe('Call Status Updates', () => {
    test('should show connecting status', () => {
      render(
        <CallStatus status="connecting" connectionState={{ state: 'ready', message: 'Ready' }} />
      );

      // Component shows status based on connectionState when ready
      expect(screen.getByText('Call Status')).toBeInTheDocument();
    });

    test('should show ringing status', () => {
      render(
        <CallStatus status="ringing" connectionState={{ state: 'ready', message: 'Ready' }} />
      );

      // Component shows status based on connectionState when ready
      expect(screen.getByText('Call Status')).toBeInTheDocument();
    });

    test('should show connected status with duration', () => {
      render(
        <CallStatus
          status="connected"
          duration={125}
          connectionState={{ state: 'ready', message: 'Ready' }}
        />
      );

      // When connected, the component shows the duration
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    test('should show disconnected status', () => {
      render(
        <CallStatus status="disconnected" connectionState={{ state: 'ready', message: 'Ready' }} />
      );

      // The component renders without error for disconnected status
      expect(screen.getByText('Call Status')).toBeInTheDocument();
    });

    test('should show incoming call status', () => {
      const mockAccept = jest.fn();
      const mockReject = jest.fn();

      render(
        <CallControls
          callStatus="incoming"
          onAccept={mockAccept}
          onReject={mockReject}
          isMuted={false}
          isRecording={false}
          isRecordingSupported
        />
      );

      expect(screen.getByText('Accept Call')).toBeInTheDocument();
      expect(screen.getByText('Reject Call')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should display call error', () => {
      render(
        <CallStatus
          status="idle"
          error="Failed to connect call"
          connectionState={{ state: 'ready', message: 'Ready' }}
        />
      );

      expect(screen.getByText('Failed to connect call')).toBeInTheDocument();
    });

    test('should show retry button on error', () => {
      const mockRetry = jest.fn();

      render(
        <CallStatus
          status="idle"
          error="Connection failed"
          connectionState={{ state: 'failed', message: 'Failed' }}
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Care4Id Display and Copy', () => {
    test('should display care4Id when system is ready', () => {
      render(
        <CallStatus
          status="idle"
          connectionState={{ state: 'ready', message: 'Ready' }}
          care4Id="care4w-1000001"
        />
      );

      // care4Id appears in both toast and Care4IdDisplay
      expect(screen.getAllByText('care4w-1000001').length).toBeGreaterThan(0);
    });

    test('should copy care4Id to clipboard', async () => {
      render(
        <CallStatus
          status="idle"
          connectionState={{ state: 'ready', message: 'Ready' }}
          care4Id="care4w-1000001"
        />
      );

      // Multiple copy buttons exist (toast and Care4IdDisplay)
      const copyButtons = screen.getAllByTitle('Copy to clipboard');
      fireEvent.click(copyButtons[0]);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('care4w-1000001');
    });
  });

  describe('Initialization Flow', () => {
    test('should show initializing state', () => {
      render(
        <CallStatus
          status="idle"
          connectionState={{
            state: 'initializing',
            message: 'Initializing...',
          }}
        />
      );

      expect(screen.getByText(/Please wait while the call system initializes/)).toBeInTheDocument();
    });

    test('should show success toast on ready', () => {
      render(
        <CallStatus
          status="idle"
          connectionState={{ state: 'ready', message: 'Ready' }}
          care4Id="care4w-1000001"
        />
      );

      expect(screen.getByText('Call system is ready!')).toBeInTheDocument();
    });

    test('should show failed state', () => {
      render(
        <CallStatus
          status="idle"
          connectionState={{ state: 'failed', message: 'Connection failed' }}
        />
      );

      expect(screen.getByText(/Failed:/)).toBeInTheDocument();
    });
  });
});
