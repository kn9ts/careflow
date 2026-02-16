/**
 * Hooks Barrel Export
 */

// State Management
export {
  useCallState,
  CallStateProvider,
  formatCallDuration,
  getStatusText,
  getStatusColor,
} from './useCallState';

// Data Fetching
export { useRecordings, useRecordingUpload } from './useRecordings';
export { useAnalytics } from './useAnalytics';
export {
  useCallHistory,
  formatCallType,
  formatCallDuration as formatHistoryDuration,
  getCallIcon,
} from './useCallHistory';

// Business Logic
export { useCallManager, useOutgoingCall } from './useCallManager';
export { useAudioRecorder } from './useAudioRecorder';

// Third-party hooks
export { useNotifications } from './useNotifications';

// Settings Management
export {
  useSettings,
  useNotificationSettings,
  useAudioSettings,
  useDisplaySettings,
  SettingsProvider,
  SettingsContext,
  DEFAULT_SETTINGS,
} from './useSettings';
