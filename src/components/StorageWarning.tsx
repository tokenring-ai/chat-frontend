import React, { useState } from 'react';
import { useChatInput } from './ChatInputContext';

/**
 * StorageWarning component - displays a subtle warning indicator when
 * chat input persistence is disabled (e.g., localStorage unavailable).
 * 
 * This component should be placed in a visible area of the chat interface
 * to alert users that their typed inputs won't be saved across sessions.
 * 
 * Features:
 * - Dismissible with close button
 * - Accessible with proper ARIA attributes
 * - Keyboard navigable (Escape to close)
 * 
 * Usage:
 * ```tsx
 * <div className="chat-container">
 *   <StorageWarning />
 *   <ChatMessages />
 *   <ChatInput />
 * </div>
 * ```
 */
export const StorageWarning: React.FC = () => {
  const { hasStorageError, getStorageError, dismissStorageError } = useChatInput();
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (!hasStorageError() || isDismissed) {
    return null;
  }

  const errorMessage = getStorageError() || 'Input persistence disabled';

  const handleClose = () => {
    setIsDismissed(true);
    dismissStorageError();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDismissed(true);
      dismissStorageError();
    }
  };

  return (
    <div 
      role="alert"
      aria-live="polite"
      className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs px-3 py-2 rounded-md flex items-center gap-2 mb-2"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-4 h-4 flex-shrink-0" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fillRule="evenodd" 
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      <span className="truncate flex-1" title={errorMessage}>
        {errorMessage}
      </span>
      <button
        onClick={handleClose}
        onKeyDown={handleKeyDown}
        aria-label="Dismiss warning"
        className="flex-shrink-0 p-0.5 hover:bg-yellow-500/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-3.5 h-3.5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
    </div>
  );
};


