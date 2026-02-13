/**
 * @jest-environment jsdom
 */

/**
 * DialerTab Component Tests
 * Tests for the DialerTab component including care4wId propagation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DialerTab from '@/app/dashboard/tabs/DialerTab';

// Mock child components
jest.mock('@/components/dashboard/CallStatus', () => ({
  __esModule: true,
  default: ({ status, care4Id, connectionState, onRetry }) => (
    <div data-testid="call-status">
      <span data-testid="status">{status}</span>
      <span data-testid="care4id">{care4Id || 'no-id'}</span>
      <span data-testid="connection-state">{connectionState?.state || 'none'}</span>
      <button onClick={onRetry} data-testid="retry-button">
        Retry
      </button>
    </div>
  ),
  ConnectionStatusBadge: ({ connectionState }) => (
    <span data-testid="connection-badge">{connectionState?.state || 'none'}</span>
  ),
}));

jest.mock('@/components/dashboard/CallControls', () => ({
  __esModule: true,
  default: ({ callStatus, onCall, onHangup, onMute, onDTMF, isMuted }) => (
    <div data-testid="call-controls">
      <span data-testid="call-status">{callStatus}</span>
      <button onClick={() => onCall('+1234567890')} data-testid="call-button">
        Call
      </button>
      <button onClick={onHangup} data-testid="hangup-button">
        Hangup
      </button>
      <button onClick={onMute} data-testid="mute-button">
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <button onClick={() => onDTMF('1')} data-testid="dtmf-button">
        DTMF
      </button>
    </div>
  ),
}));

jest.mock('@/components/dashboard/DialPad', () => ({
  __esModule: true,
  default: ({ phoneNumber, setPhoneNumber, disabled }) => (
    <div data-testid="dial-pad">
      <input
        data-testid="phone-input"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        disabled={disabled}
      />
    </div>
  ),
}));

jest.mock('@/components/common/Loading/LoadingComponents', () => ({
  CardSkeleton: () => <div data-testid="card-skeleton">Loading...</div>,
}));

describe('DialerTab Component', () => {
  const mockCallManager = {
    callStatus: 'idle',
    callDuration: 0,
    phoneNumber: '',
    callError: null,
    isMuted: false,
    connectionState: { state: 'ready', message: 'Ready' },
    retryInitialization: jest.fn(),
    care4wId: 'care4w-test123',
    makeCall: jest.fn(),
    hangupCall: jest.fn(),
    acceptCall: jest.fn(),
    rejectCall: jest.fn(),
    toggleMute: jest.fn(),
    sendDigits: jest.fn(),
  };

  const mockAudioRecorder = {
    isRecording: false,
    recordingSupported: true,
    recordingDuration: 0,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
  };

  const mockAnalytics = {
    totalCalls: 10,
    totalDuration: 600,
    successRate: 85,
    todayCalls: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('care4wId Propagation', () => {
    test('should pass care4wId to CallStatus component', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('care4id')).toHaveTextContent('care4w-test123');
    });

    test('should handle null care4wId gracefully', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, care4wId: null }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('care4id')).toHaveTextContent('no-id');
    });

    test('should handle undefined care4wId gracefully', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, care4wId: undefined }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('care4id')).toHaveTextContent('no-id');
    });

    test('should update CallStatus when care4wId changes', () => {
      const { rerender } = render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('care4id')).toHaveTextContent('care4w-test123');

      rerender(
        <DialerTab
          callManager={{ ...mockCallManager, care4wId: 'care4w-newid456' }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('care4id')).toHaveTextContent('care4w-newid456');
    });
  });

  describe('Connection State Propagation', () => {
    test('should pass connection state to CallStatus', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('connection-state')).toHaveTextContent('ready');
    });

    test('should show connection badge when not ready', () => {
      render(
        <DialerTab
          callManager={{
            ...mockCallManager,
            connectionState: {
              state: 'initializing',
              message: 'Initializing...',
            },
          }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('connection-badge')).toHaveTextContent('initializing');
    });

    test('should not show connection badge when ready', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      // Badge should not be visible when ready
      expect(screen.queryByTestId('connection-badge')).not.toBeInTheDocument();
    });
  });

  describe('Call Status Propagation', () => {
    test('should pass call status to CallStatus component', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, callStatus: 'connected' }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    test('should pass call status to CallControls component', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, callStatus: 'ringing' }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getAllByTestId('call-status')[0]).toHaveTextContent('ringing');
    });
  });

  describe('Call Actions', () => {
    test('should call makeCall when call button clicked', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      fireEvent.click(screen.getByTestId('call-button'));
      expect(mockCallManager.makeCall).toHaveBeenCalledWith('+1234567890');
    });

    test('should call hangupCall when hangup button clicked', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      fireEvent.click(screen.getByTestId('hangup-button'));
      expect(mockCallManager.hangupCall).toHaveBeenCalled();
    });

    test('should call toggleMute when mute button clicked', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      fireEvent.click(screen.getByTestId('mute-button'));
      expect(mockCallManager.toggleMute).toHaveBeenCalled();
    });

    test('should call sendDigits when DTMF button clicked', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      fireEvent.click(screen.getByTestId('dtmf-button'));
      expect(mockCallManager.sendDigits).toHaveBeenCalledWith('1');
    });
  });

  describe('Retry Initialization', () => {
    test('should call retryInitialization when retry clicked', () => {
      render(
        <DialerTab
          callManager={{
            ...mockCallManager,
            connectionState: { state: 'failed', message: 'Failed' },
          }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      fireEvent.click(screen.getByTestId('retry-button'));
      expect(mockCallManager.retryInitialization).toHaveBeenCalled();
    });
  });

  describe('Analytics Display', () => {
    test('should display analytics when provided', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByText('10')).toBeInTheDocument(); // totalCalls
      expect(screen.getByText('85%')).toBeInTheDocument(); // successRate
      expect(screen.getByText('2')).toBeInTheDocument(); // todayCalls
    });

    test('should handle missing analytics gracefully', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={null}
        />
      );

      expect(screen.getByText('Loading stats...')).toBeInTheDocument();
    });

    test('should display analytics error when provided', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={null}
          analyticsError="Failed to load analytics"
        />
      );

      expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('should show loading skeleton during initialization', () => {
      render(
        <DialerTab
          callManager={{
            ...mockCallManager,
            connectionState: {
              state: 'initializing',
              message: 'Initializing...',
              isInitializing: true,
            },
          }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      // Use getAllByTestId since there may be multiple skeletons
      expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0);
    });

    test('should show loading skeleton during analytics loading', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={null}
          analyticsLoading
        />
      );

      // Use getAllByTestId since there may be multiple skeletons
      expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('DialPad Integration', () => {
    test('should disable dialpad during connected call', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, callStatus: 'connected' }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('phone-input')).toBeDisabled();
    });

    test('should disable dialpad during initialization', () => {
      render(
        <DialerTab
          callManager={{
            ...mockCallManager,
            connectionState: {
              state: 'initializing',
              message: 'Initializing...',
            },
          }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('phone-input')).toBeDisabled();
    });

    test('should enable dialpad when ready', () => {
      render(
        <DialerTab
          callManager={mockCallManager}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('phone-input')).not.toBeDisabled();
    });
  });

  describe('Mute State Propagation', () => {
    test('should pass muted state to CallControls', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, isMuted: true }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('mute-button')).toHaveTextContent('Unmute');
    });

    test('should pass unmuted state to CallControls', () => {
      render(
        <DialerTab
          callManager={{ ...mockCallManager, isMuted: false }}
          audioRecorder={mockAudioRecorder}
          analytics={mockAnalytics}
        />
      );

      expect(screen.getByTestId('mute-button')).toHaveTextContent('Mute');
    });
  });
});
