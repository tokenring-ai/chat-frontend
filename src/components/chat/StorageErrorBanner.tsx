import React from 'react';
import { useChatInput } from '../ChatInputContext';

/**
 * StorageErrorBanner - Displays a dismissible warning when localStorage is unavailable
 * 
 * This component should be rendered at the top level of the chat interface
 * to inform users when chat input history persistence is disabled.
 * 
 * Features:
 * - Visible warning with clear explanation
 * - Actionable guidance for users
 * - Dismissible to reduce annoyance
 * - Auto-hides when storage becomes available
 */
export const StorageErrorBanner: React.FC = () => {
  const { hasStorageError, getStorageError, dismissStorageError } = useChatInput();

  if (!hasStorageError()) {
    return null;
  }

  const errorMessage = getStorageError();

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: '#fef3c7',
        color: '#92400e',
        padding: '12px 16px',
        borderBottom: '1px solid #f59e0b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        gap: '12px',
        fontSize: '14px',
        lineHeight: '1.4',
      }}
    >
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>
          ⚠️ Chat Input History Disabled
        </strong>
        <div>{errorMessage}</div>
        <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.8 }}>
          Your typed messages won't be saved between sessions until storage is available.
        </div>
      </div>
      
      <button
        onClick={dismissStorageError}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '12px',
          color: '#92400e',
          opacity: 0.7,
          borderRadius: '4px',
          alignSelf: 'center',
        }}
        aria-label="Dismiss warning"
        title="Dismiss this warning"
      >
        Dismiss
      </button>
    </div>
  );
};
