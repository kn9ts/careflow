/**
 * Recordings Tab Component
 * Displays and manages recordings with enhanced UI
 */

import { RefreshCw, FileAudio, HardDrive, Clock, Mic } from 'lucide-react';
import RecordingManager from '@/components/dashboard/RecordingManager';
import styles from './RecordingsTab.module.css';

export default function RecordingsTab({
  recordings,
  recordingsLoading,
  recordingsError,
  onRefreshRecordings,
  audioRecorder,
}) {
  // Calculate summary stats
  const totalRecordings = recordings?.length || 0;
  const totalSize = recordings?.reduce((acc, rec) => acc + (rec.size || 0), 0) || 0;
  const totalDuration = recordings?.reduce((acc, rec) => acc + (rec.duration || 0), 0) || 0;

  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={styles.recordingsTab}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>Recordings</h2>
          <p className={styles.tabDescription}>Manage and play back your call recordings</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          {audioRecorder?.isRecording && (
            <div className={styles.recordingIndicator}>
              <span className={styles.recordingDot} />
              <span>Recording...</span>
            </div>
          )}
          <button
            onClick={onRefreshRecordings}
            className={styles.refreshBtn}
            disabled={recordingsLoading}
            aria-label="Refresh recordings"
          >
            <RefreshCw size={16} className={recordingsLoading ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {!recordingsLoading && !recordingsError && recordings?.length > 0 && (
        <div className={styles.statsSummary}>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <FileAudio className="w-5 h-5 text-secondary-400" />
            </div>
            <p className={styles.statValue}>{totalRecordings}</p>
            <p className={styles.statLabel}>Recordings</p>
          </div>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <HardDrive className="w-5 h-5 text-accent-400" />
            </div>
            <p className={styles.statValue}>{formatSize(totalSize)}</p>
            <p className={styles.statLabel}>Total Size</p>
          </div>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <p className={styles.statValue}>{formatDuration(totalDuration)}</p>
            <p className={styles.statLabel}>Total Duration</p>
          </div>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <Mic className="w-5 h-5 text-success-400" />
            </div>
            <p className={styles.statValue}>{audioRecorder?.isRecording ? 'Active' : 'Ready'}</p>
            <p className={styles.statLabel}>Status</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {recordingsError && (
        <div className={styles.errorMessage}>
          <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-medium">Failed to load recordings</p>
            <p className="text-error-400/80 text-sm mt-1">{recordingsError}</p>
          </div>
        </div>
      )}

      {/* Recording Manager */}
      <RecordingManager
        recordings={recordings || []}
        recordingsLoading={recordingsLoading}
        currentRecording={null}
        isRecording={audioRecorder?.isRecording || false}
        onRefresh={onRefreshRecordings}
      />

      {/* Empty State */}
      {!recordingsLoading && !recordingsError && (!recordings || recordings.length === 0) && (
        <div className={styles.emptyState}>
          <FileAudio className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No recordings yet</h3>
          <p className={styles.emptyDescription}>
            Your call recordings will appear here. Start a call and enable recording to see them.
          </p>
        </div>
      )}
    </div>
  );
}
