/**
 * History Tab Component
 * Displays call history with enhanced UI
 */

import { RefreshCw, History, Phone, Clock, TrendingUp } from 'lucide-react';
import CallHistory from '@/components/dashboard/CallHistory';
import { TableSkeleton } from '@/components/common/Loading/LoadingComponents';
import styles from './HistoryTab.module.css';

export default function HistoryTab({
  callHistory,
  historyLoading,
  historyError,
  onRefreshHistory,
  displaySettings,
}) {
  // Calculate summary stats
  const totalCalls = callHistory?.length || 0;
  const totalDuration = callHistory?.reduce((acc, call) => acc + (call.duration || 0), 0) || 0;
  const incomingCalls = callHistory?.filter((call) => call.direction === 'inbound').length || 0;
  const outgoingCalls = callHistory?.filter((call) => call.direction === 'outbound').length || 0;

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
    <div className={styles.historyTab}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>Call History</h2>
          <p className={styles.tabDescription}>View and manage your recent calls</p>
        </div>
        <button
          onClick={onRefreshHistory}
          className={styles.refreshBtn}
          disabled={historyLoading}
          aria-label="Refresh call history"
        >
          <RefreshCw size={16} className={historyLoading ? styles.spinning : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Summary */}
      {!historyLoading && !historyError && callHistory?.length > 0 && (
        <div className={styles.statsSummary}>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <Phone className="w-5 h-5 text-secondary-400" />
            </div>
            <p className={styles.statValue}>{totalCalls}</p>
            <p className={styles.statLabel}>Total Calls</p>
          </div>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-accent-400" />
            </div>
            <p className={styles.statValue}>{formatDuration(totalDuration)}</p>
            <p className={styles.statLabel}>Talk Time</p>
          </div>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-success-400" />
            </div>
            <p className={styles.statValue}>{incomingCalls}</p>
            <p className={styles.statLabel}>Incoming</p>
          </div>
          <div className={styles.statCard}>
            <div className="flex items-center justify-center mb-2">
              <History className="w-5 h-5 text-purple-400" />
            </div>
            <p className={styles.statValue}>{outgoingCalls}</p>
            <p className={styles.statLabel}>Outgoing</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {historyError && (
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
            <p className="font-medium">Failed to load call history</p>
            <p className="text-error-400/80 text-sm mt-1">{historyError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {historyLoading ? (
        <div className={styles.loadingState}>
          <TableSkeleton rows={10} columns={4} />
        </div>
      ) : (
        <CallHistory
          calls={callHistory}
          onRefresh={onRefreshHistory}
          displaySettings={displaySettings}
        />
      )}

      {/* Empty State */}
      {!historyLoading && !historyError && (!callHistory || callHistory.length === 0) && (
        <div className={styles.emptyState}>
          <History className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No calls yet</h3>
          <p className={styles.emptyDescription}>
            Your call history will appear here once you make or receive calls.
          </p>
        </div>
      )}
    </div>
  );
}
