/**
 * DashboardHeader Component
 * Self-contained header with user menu, notifications, and mode display
 */

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Phone as PhoneIcon,
  Bell,
  User,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader({ onOpenDialPad, className = '', onToggleSidebar }) {
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
        {/* Mobile menu toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="btn-icon md:hidden mr-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand */}
        <div className="brand">
          <div className="brand-logo">
            <PhoneIcon className="w-5 h-5 text-white" />
          </div>
          <span className="brand-name hidden sm:inline">CareFlow</span>
        </div>
      </div>

      <div className="header-center">
        {/* Quick Dial Button - Desktop */}
        {onOpenDialPad && (
          <button
            onClick={onOpenDialPad}
            className={`hidden md:flex ${styles.quickDialBtn}`}
            aria-label="Quick dial"
          >
            <PhoneIcon className="w-4 h-4" />
            <span>Quick Dial</span>
          </button>
        )}
      </div>

      <div className="header-right">
        {/* Quick Dial Button - Mobile */}
        {onOpenDialPad && (
          <button
            onClick={onOpenDialPad}
            className={`btn-icon md:hidden ${styles.headerActionBtn}`}
            aria-label="Open dial pad"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
        )}

        {/* Notifications */}
        <div className={styles.dropdownWrapper}>
          <button
            onClick={toggleNotifications}
            className={`btn-icon ${styles.headerActionBtn}`}
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="w-5 h-5" />
            <span className={styles.notificationBadge}>3</span>
          </button>

          {showNotifications && (
            <div className={styles.dropdownMenu} role="menu">
              <div className={styles.dropdownHeader}>
                <h3>Notifications</h3>
                <span className="badge badge-secondary">3 new</span>
              </div>
              <div className={styles.dropdownBody}>
                <NotificationItem
                  title="Missed call"
                  message="You missed a call from +1234567890"
                  time="2 min ago"
                  type="call"
                />
                <NotificationItem
                  title="New voicemail"
                  message="You have a new voicemail"
                  time="1 hour ago"
                  type="voicemail"
                />
                <NotificationItem
                  title="System update"
                  message="CareFlow has been updated"
                  time="1 day ago"
                  type="system"
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
          <button
            onClick={toggleUserMenu}
            className={styles.userMenuBtn}
            aria-label="User menu"
            aria-expanded={showUserMenu}
          >
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'User'}
                width={32}
                height={32}
                className={styles.userAvatar}
              />
            ) : (
              <div className={styles.userAvatarPlaceholder}>
                <User className="w-4 h-4" />
              </div>
            )}
            <span className={`hidden sm:inline ${styles.userName}`}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </span>
            {showUserMenu ? (
              <ChevronUp className="w-4 h-4 text-navy-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-navy-300" />
            )}
          </button>

          {showUserMenu && (
            <div className={styles.dropdownMenu} role="menu">
              <div className={styles.dropdownHeader}>
                <div className="flex items-center gap-3">
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className={styles.userAvatarPlaceholder}>
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-navy-400">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className={styles.dropdownBody}>
                <button onClick={handleProfile} role="menuitem">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button onClick={handleSettings} role="menuitem">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
              <div className={styles.dropdownFooter}>
                <button onClick={handleLogout} className={styles.logoutBtn} role="menuitem">
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
          aria-hidden="true"
        />
      )}
    </header>
  );
}

function NotificationItem({ title, message, time, type }) {
  const getIcon = () => {
    switch (type) {
      case 'call':
        return (
          <div className={styles.notificationIconCall}>
            <PhoneIcon className="w-4 h-4 text-primary-400" />
          </div>
        );
      case 'voicemail':
        return (
          <div className={styles.notificationIconVoicemail}>
            <svg
              className="w-4 h-4 text-secondary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className={styles.notificationIconSystem}>
            <Bell className="w-4 h-4 text-purple-400" />
          </div>
        );
    }
  };

  return (
    <div className={styles.notificationItem}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className={styles.notificationContent}>
          <p className={styles.notificationTitle}>{title}</p>
          <p className={styles.notificationMessage}>{message}</p>
          <span className={styles.notificationTime}>{time}</span>
        </div>
      </div>
    </div>
  );
}
