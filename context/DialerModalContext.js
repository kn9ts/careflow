/**
 * DialerModal Context
 *
 * Provides global state management for the dialer modal overlay.
 * This allows the dialer to be opened from anywhere in the dashboard
 * without affecting the current route or layout.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DialerModalContext = createContext(null);

/**
 * Provider component for dialer modal state
 * Wrap this around components that need access to the dialer modal
 */
export function DialerModalProvider({ children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleModal = useCallback(() => {
    setIsModalOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isModalOpen,
      openModal,
      closeModal,
      toggleModal,
    }),
    [isModalOpen, openModal, closeModal, toggleModal]
  );

  return <DialerModalContext.Provider value={value}>{children}</DialerModalContext.Provider>;
}

/**
 * Hook to access dialer modal state and actions
 * @returns {Object} { isModalOpen, openModal, closeModal, toggleModal }
 */
export function useDialerModal() {
  const context = useContext(DialerModalContext);
  if (!context) {
    throw new Error('useDialerModal must be used within a DialerModalProvider');
  }
  return context;
}

export default DialerModalContext;
