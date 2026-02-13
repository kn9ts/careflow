/**
 * History Tab Component
 * Displays call history
 */

import { RefreshCw } from 'lucide-react';
import CallHistory from '@/components/dashboard/CallHistory';
import { CardSkeleton, TableSkeleton } from '@/components/common/Loading/LoadingComponents';

export default function HistoryTab({
  callHistory,
  historyLoading,
  historyError,
  onRefreshHistory,
}) {
  return (
    <div className="history-tab">
      <div className="tab-header">
        <h2 className="tab-title">Call History</h2>
        <button onClick={onRefreshHistory} className="refresh-btn" disabled={historyLoading}>
          <RefreshCw size={16} className={historyLoading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {historyError && <div className="error-message">{historyError}</div>}

      {historyLoading ? (
        <div className="loading-state">
          <TableSkeleton rows={10} columns={4} />
        </div>
      ) : (
        <CallHistory calls={callHistory} onRefresh={onRefreshHistory} />
      )}

      <style jsx>{`
        .history-tab {
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
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}
