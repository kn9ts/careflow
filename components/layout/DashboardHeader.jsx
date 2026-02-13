/**
 * DashboardHeader Component
 * Self-contained header with user menu, notifications, and mode display
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone as PhoneIcon,
  Bell,
  User,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader({ onOpenDialPad, className = '' }) {
  const router = useRouter();
  const { user, logout, token } = useAuth();
  const { unregisterToken } = useNotifications({ token });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await unregisterToken();
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router, logout, unregisterToken]);

  const handleSettings = useCallback(() => {
    setShowUserMenu(false);
    router.push('/settings');
  }, [router]);

  const handleProfile = useCallback(() => {
    setShowUserMenu(false);
    router.push('/profile');
  }, [router]);

  const toggleUserMenu = useCallback(() => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  }, [showUserMenu]);

  const toggleNotifications = useCallback(() => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  }, [showNotifications]);

  return (
    <header className={`header ${className}`}>
      <div className="header-left">
        <h1 className="brand-name">CareFlow</h1>
      </div>

      <div className="header-center" />

      <div className="header-right">
        {/* Quick Dial Button */}
        {onOpenDialPad && (
          <button
            onClick={onOpenDialPad}
            className={`header-action-btn ${styles.headerActionBtn}`}
            aria-label="Open dial pad"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
        )}

        {/* Notifications */}
        <div className={styles.dropdownWrapper}>
          <button
            onClick={toggleNotifications}
            className={`header-action-btn ${styles.headerActionBtn}`}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className={`notification-badge ${styles.notificationBadge}`}>3</span>
          </button>

          {showNotifications && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <h3>Notifications</h3>
              </div>
              <div className={styles.dropdownBody}>
                <NotificationItem
                  title="Missed call"
                  message="You missed a call from +1234567890"
                  time="2 min ago"
                />
                <NotificationItem
                  title="New voicemail"
                  message="You have a new voicemail"
                  time="1 hour ago"
                />
                <NotificationItem
                  title="System update"
                  message="CareFlow has been updated"
                  time="1 day ago"
                />
              </div>
              <div className={styles.dropdownFooter}>
                <button onClick={() => router.push('/notifications')}>
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className={styles.dropdownWrapper}>
          <button onClick={toggleUserMenu} className="user-menu-btn">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className={styles.userAvatar}
              />
            ) : (
              <div className="user-avatar-placeholder">
                <User className="w-5 h-5" />
              </div>
            )}
            <span className={styles.userName}>{user?.displayName || user?.email || 'User'}</span>
            {showUserMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showUserMenu && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">Logged in</p>
              </div>
              <div className={styles.dropdownBody}>
                <button onClick={handleProfile}>
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button onClick={handleSettings}>
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
              <div className={styles.dropdownFooter}>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifications) && (
        <div
          className={styles.dropdownBackdrop}
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
}

function NotificationItem({ title, message, time }) {
  return (
    <div className={styles.notificationItem}>
      <div className={styles.notificationContent}>
        <p className={styles.notificationTitle}>{title}</p>
        <p className={styles.notificationMessage}>{message}</p>
      </div>
      <span className={styles.notificationTime}>{time}</span>
    </div>
  );
}
