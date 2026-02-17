/**
 * QuickStats Component
 * Displays real-time analytics data in stat cards
 *
 * REFACTORED: Aligned with Analytics.js card design pattern
 * - Uses consistent card styling with bg-background-input
 * - Circular icon containers matching Analytics.js
 * - Consistent typography and spacing
 * - Design system color tokens
 *
 * Features:
 * - 6 stat cards with icons
 * - Loading states with skeleton components
 * - Error handling with fallback UI
 * - Auto-refresh for real-time updates
 * - Responsive design
 * - Formatted numbers and durations
 * - Storage progress bar with color coding
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PhoneIncoming,
  PhoneMissed,
  Voicemail,
  Phone,
  Clock,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import styles from './QuickStats.module.css';

// Storage limit (10GB default - can be configured via env)
const STORAGE_LIMIT_BYTES =
  parseInt(process.env.NEXT_PUBLIC_STORAGE_LIMIT_GB || '10', 10) * 1024 * 1024 * 1024;

/**
 * Format number with thousand separators
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format duration in a human-readable way
 */
function formatDurationHuman(seconds) {
  if (!seconds || seconds <= 0) return '0 min';

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}

/**
 * Format storage size (bytes to MB/GB)
 */
function formatStorage(bytes) {
  if (!bytes || bytes <= 0) return { value: '0', unit: 'MB' };

  const mb = bytes / (1024 * 1024);
  const gb = bytes / (1024 * 1024 * 1024);

  if (gb >= 1) {
    return { value: gb.toFixed(2), unit: 'GB' };
  }
  return { value: mb.toFixed(0), unit: 'MB' };
}

/**
 * Get storage progress class based on percentage used
 */
function getStorageProgressClass(percentage) {
  if (percentage < 70) return styles.storageProgressGreen;
  if (percentage < 90) return styles.storageProgressYellow;
  return styles.storageProgressRed;
}

/**
 * Stat Card Component - Matches Analytics.js card design
 */
function StatCard({ icon: Icon, label, value, subValue, iconBgClass, loading = false }) {
  if (loading) {
    return (
      <div className={styles.statCard}>
        <div className={styles.statCardInner}>
          <div>
            <div className={styles.skeletonLabel} />
            <div className={styles.skeletonValue} />
          </div>
          <div className={styles.skeletonIcon} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardInner}>
        <div>
          <p className={styles.statLabel}>{label}</p>
          <p className={styles.statValue}>{value}</p>
          {subValue && <p className={styles.statSubValue}>{subValue}</p>}
        </div>
        <div className={iconBgClass}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

/**
 * Storage Card Component with progress bar - Matches Analytics.js card design
 */
function StorageCard({ used, total, loading = false }) {
  if (loading) {
    return (
      <div className={`${styles.statCard} ${styles.statCardWide}`}>
        <div className={styles.statCardInner}>
          <div className="flex-1">
            <div className={styles.skeletonLabel} />
            <div className={styles.skeletonValue} />
            <div className={styles.skeletonProgress} />
          </div>
          <div className={styles.skeletonIcon} />
        </div>
      </div>
    );
  }

  const usedFormatted = formatStorage(used);
  const totalFormatted = formatStorage(total);
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const progressClass = getStorageProgressClass(percentage);

  return (
    <div className={`${styles.statCard} ${styles.statCardWide}`}>
      <div className={styles.statCardInner}>
        <div className="flex-1">
          <p className={styles.statLabel}>Storage Used</p>
          <p className={styles.statValue}>
            {usedFormatted.value} {usedFormatted.unit} / {totalFormatted.value}{' '}
            {totalFormatted.unit}
          </p>
          <div className={styles.storageProgressContainer}>
            <div className={styles.storageProgressBar}>
              <div className={progressClass} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <span className={styles.storagePercentage}>{percentage.toFixed(1)}%</span>
          </div>
        </div>
        <div className={styles.iconBgPurple}>
          <HardDrive size={24} />
        </div>
      </div>
    </div>
  );
}

/**
 * QuickStats Component
 */
export default function QuickStats({
  analytics,
  analyticsError,
  analyticsLoading,
  onRefresh,
  autoRefreshInterval = 60000, // 1 minute default
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, isRefreshing]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshInterval > 0 && onRefresh) {
      const interval = setInterval(() => {
        onRefresh();
      }, autoRefreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefreshInterval, onRefresh]);

  // Show error state
  if (analyticsError && !analytics) {
    return (
      <div className={styles.quickStatsCard}>
        <div className={styles.quickStatsHeader}>
          <h2 className={styles.quickStatsTitle}>Quick Stats</h2>
        </div>
        <div className={styles.quickStatsError}>
          <p className={styles.errorText}>{analyticsError}</p>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              className={styles.retryButton}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isLoading = analyticsLoading || !analytics;

  return (
    <div className={styles.quickStatsCard}>
      <div className={styles.quickStatsHeader}>
        <div>
          <h2 className={styles.quickStatsTitle}>Quick Stats</h2>
          <p className={styles.quickStatsSubtitle}>Real-time overview</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            className={styles.refreshButton}
            disabled={isRefreshing || isLoading}
            title="Refresh stats"
            aria-label="Refresh statistics"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className={styles.statsGrid}>
        {/* Received Calls Today */}
        <StatCard
          icon={PhoneIncoming}
          label="Received Calls"
          value={formatNumber(analytics?.todayReceivedCalls || 0)}
          subValue="today"
          iconBgClass={styles.iconBgGreen}
          loading={isLoading}
        />

        {/* Missed Calls Today */}
        <StatCard
          icon={PhoneMissed}
          label="Missed Calls"
          value={formatNumber(analytics?.todayMissedCalls || 0)}
          subValue="today"
          iconBgClass={styles.iconBgRed}
          loading={isLoading}
        />

        {/* Voicemails */}
        <StatCard
          icon={Voicemail}
          label="Voicemails"
          value={formatNumber(analytics?.totalVoicemails || 0)}
          iconBgClass={styles.iconBgOrange}
          loading={isLoading}
        />

        {/* Total Calls (in & out) */}
        <StatCard
          icon={Phone}
          label="Total Calls"
          value={formatNumber(analytics?.totalCalls || 0)}
          subValue="in & out"
          iconBgClass={styles.iconBgBlue}
          loading={isLoading}
        />

        {/* Total Minutes Today */}
        <StatCard
          icon={Clock}
          label="Total Time"
          value={formatDurationHuman(analytics?.todayDuration || 0)}
          subValue="today"
          iconBgClass={styles.iconBgCyan}
          loading={isLoading}
        />

        {/* Storage Used */}
        <StorageCard
          used={analytics?.storageUsed || 0}
          total={STORAGE_LIMIT_BYTES}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
