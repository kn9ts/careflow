/**
 * Recordings Tab Component
 * Displays and manages recordings
 */

import { RefreshCw } from 'lucide-react';
import RecordingManager from '@/components/dashboard/RecordingManager';
import { CardSkeleton } from '@/components/common/Loading/LoadingComponents';

export default function RecordingsTab({
  recordings,
  recordingsLoading,
  recordingsError,
  onRefreshRecordings,
  audioRecorder,
}) {
  return (
    <div className="recordings-tab">
      <div className="tab-header">
        <h2 className="tab-title">Recordings</h2>
        <button onClick={onRefreshRecordings} className="refresh-btn" disabled={recordingsLoading}>
          <RefreshCw size={16} className={recordingsLoading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {recordingsError && <div className="error-message">{recordingsError}</div>}

      {recordingsLoading ? (
        <div className="loading-state">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <RecordingManager
          recordings={recordings || []}
          currentRecording={null}
          isRecording={audioRecorder?.isRecording || false}
          onRefresh={onRefreshRecordings}
        />
      )}

      <style jsx>{`
        .recordings-tab {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .tab-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tab-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #f8fafc;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #334155;
          border: none;
          border-radius: 0.5rem;
          color: #f8fafc;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-btn:hover {
          background: #475569;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          color: #f87171;
          font-size: 0.875rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
