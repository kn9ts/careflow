/**
 * Analytics Tab Component
 * Displays analytics data and charts with enhanced UI
 */

import { RefreshCw, BarChart2, TrendingUp, TrendingDown, Phone, Clock, Users } from 'lucide-react';
import Analytics from '@/components/dashboard/Analytics';
import { CardSkeleton } from '@/components/common/Loading/LoadingComponents';
import styles from './AnalyticsTab.module.css';

export default function AnalyticsTab({
  analytics,
  analyticsLoading,
  analyticsError,
  onRefreshAnalytics,
  displaySettings,
}) {
  // Calculate overview stats from analytics data
  const totalCalls = analytics?.totalCalls || 0;
  const totalDuration = analytics?.totalDuration || 0;
  const averageDuration = analytics?.averageDuration || 0;
  const uniqueContacts = analytics?.uniqueContacts || 0;

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Overview cards data
  const overviewCards = [
    {
      icon: Phone,
      value: totalCalls,
      label: 'Total Calls',
      trend: '+12%',
      trendUp: true,
      gradient: 'from-secondary-500/20 to-secondary-500/5',
      iconColor: 'text-secondary-400',
    },
    {
      icon: Clock,
      value: formatDuration(totalDuration),
      label: 'Talk Time',
      trend: '+8%',
      trendUp: true,
      gradient: 'from-accent-500/20 to-accent-500/5',
      iconColor: 'text-accent-400',
    },
    {
      icon: TrendingUp,
      value: formatDuration(averageDuration),
      label: 'Avg. Duration',
      trend: '-3%',
      trendUp: false,
      gradient: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-400',
    },
    {
      icon: Users,
      value: uniqueContacts,
      label: 'Unique Contacts',
      trend: '+5%',
      trendUp: true,
      gradient: 'from-success-500/20 to-success-500/5',
      iconColor: 'text-success-400',
    },
  ];

  return (
    <div className={styles.analyticsTab}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>Analytics</h2>
          <p className={styles.tabDescription}>Track your call performance and insights</p>
        </div>
        <button
          onClick={onRefreshAnalytics}
          className={styles.refreshBtn}
          disabled={analyticsLoading}
          aria-label="Refresh analytics"
        >
          <RefreshCw size={16} className={analyticsLoading ? styles.spinning : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error State */}
      {analyticsError && (
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
            <p className="font-medium">Failed to load analytics</p>
            <p className="text-error-400/80 text-sm mt-1">{analyticsError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {analyticsLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.overviewGrid}>
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className={styles.chartsGrid}>
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {!analyticsError && (
            <div className={styles.overviewGrid}>
              {overviewCards.map((card, index) => (
                <div key={index} className={styles.overviewCard}>
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`}
                  />
                  <div className={styles.overviewCardIcon}>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}
                    >
                      <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className={styles.overviewCardValue}>{card.value}</p>
                  <p className={styles.overviewCardLabel}>{card.label}</p>
                  <div
                    className={`${styles.overviewCardTrend} ${card.trendUp ? styles.trendUp : styles.trendDown}`}
                  >
                    {card.trendUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{card.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analytics Component */}
          <Analytics
            data={analytics}
            onRefresh={onRefreshAnalytics}
            displaySettings={displaySettings}
          />
        </>
      )}

      {/* Empty State */}
      {!analyticsLoading && !analyticsError && !analytics && (
        <div className={styles.emptyState}>
          <BarChart2 className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No analytics data</h3>
          <p className={styles.emptyDescription}>
            Analytics data will appear here once you start making calls.
          </p>
        </div>
      )}
    </div>
  );
}
