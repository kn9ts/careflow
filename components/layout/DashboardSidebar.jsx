/**
 * DashboardSidebar Component
 * Self-contained sidebar navigation with collapsible state
 */

import { useState, useCallback, createContext, useContext } from 'react';
import {
  Phone,
  History,
  BarChart2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import styles from './DashboardSidebar.module.css';

// Sidebar Context
const SidebarContext = createContext(null);

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function DashboardSidebar({ activeTab = 'dialer', onTabChange, className = '' }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    { id: 'dialer', icon: Phone, label: 'Dialer' },
    { id: 'history', icon: History, label: 'Call History' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
    { id: 'recordings', icon: FileText, label: 'Recordings' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle }}>
      <aside className={`sidebar ${isCollapsed ? styles.sidebarCollapsed : ''} ${className}`}>
        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.sidebarItem} ${activeTab === item.id ? styles.sidebarItemActive : ''}`}
              onClick={() => handleTabClick(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={styles.sidebarIcon} size={20} />
              {!isCollapsed && <span className={styles.sidebarLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            className={styles.sidebarToggleBtn}
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <>
                <ChevronLeft size={20} />
                {!isCollapsed && <span className={styles.sidebarToggleLabel}>Collapse</span>}
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
