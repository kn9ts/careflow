/**
 * DashboardSidebar Component
 * Self-contained sidebar navigation with collapsible state
 */

'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import {
  Phone,
  History,
  BarChart2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  TrendingUp,
} from 'lucide-react';
import styles from './DashboardSidebar.module.css';

// Sidebar Context
const SidebarContext = createContext(null);

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function DashboardSidebar({
  activeTab = 'dialer',
  onTabChange,
  className = '',
  todayStats = null,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Default values when stats are not available
  const totalCalls = todayStats?.totalCalls ?? 0;
  const totalTalkTime = todayStats?.totalTalkTime ?? 0;
  const talkTimeDisplay =
    totalTalkTime >= 60
      ? `${Math.floor(totalTalkTime / 60)}h ${totalTalkTime % 60}m`
      : `${totalTalkTime}m`;

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleTabClick = useCallback(
    (tabId) => {
      if (onTabChange) {
        onTabChange(tabId);
      }
    },
    [onTabChange]
  );

  const menuItems = [
    {
      id: 'dialer',
      icon: Phone,
      label: 'Dialer',
      description: 'Make calls',
      gradient: 'from-secondary-400 to-secondary-500',
    },
    {
      id: 'history',
      icon: History,
      label: 'Call History',
      description: 'View past calls',
      gradient: 'from-primary-400 to-accent-400',
    },
    {
      id: 'analytics',
      icon: BarChart2,
      label: 'Analytics',
      description: 'View statistics',
      gradient: 'from-purple-400 to-accent-400',
    },
    {
      id: 'recordings',
      icon: FileText,
      label: 'Recordings',
      description: 'Manage recordings',
      gradient: 'from-success-400 to-secondary-400',
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      description: 'Configure app',
      gradient: 'from-navy-400 to-navy-500',
    },
  ];

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle }}>
      <aside
        className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${className}`}
      >
        {/* Logo/Brand Section */}
        {!isCollapsed && (
          <div className={styles.brandSection}>
            <div className={styles.brandContent}>
              <div className={styles.brandLogo}>
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={styles.brandName}>CareFlow</h2>
                <p className={styles.brandSubtitle}>Communication Hub</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={styles.sidebarNav} role="navigation" aria-label="Main navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.sidebarItem} ${activeTab === item.id ? styles.sidebarItemActive : ''}`}
              onClick={() => handleTabClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              data-tooltip={isCollapsed ? item.label : undefined}
              aria-current={activeTab === item.id ? 'page' : undefined}
              aria-label={item.label}
            >
              <item.icon className={styles.sidebarIcon} size={20} />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <span className={styles.sidebarLabel}>{item.label}</span>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Quick Stats - Only show when expanded */}
        {!isCollapsed && (
          <div className={styles.quickStats}>
            <div className={styles.quickStatsCard}>
              <div className={styles.quickStatsHeader}>
                <TrendingUp className={styles.quickStatsIcon} />
                <span className={styles.quickStatsTitle}>Today's Stats</span>
              </div>
              <div className={styles.quickStatsGrid}>
                <div className={styles.quickStatsItem}>
                  <p className={styles.quickStatsValue}>{totalCalls}</p>
                  <p className={styles.quickStatsLabel}>Calls</p>
                </div>
                <div className={styles.quickStatsItem}>
                  <p className={styles.quickStatsValue}>{talkTimeDisplay}</p>
                  <p className={styles.quickStatsLabel}>Talk Time</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with collapse toggle */}
        <div className={styles.sidebarFooter}>
          <button
            className={styles.sidebarToggleBtn}
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className={styles.sidebarToggleLabel}>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}

/**
 * Sidebar Tab Content Wrapper
 * Used to display content for each tab
 */
export function SidebarTabContent({ children }) {
  return <div className="tab-content">{children}</div>;
}
