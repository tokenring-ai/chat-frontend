import {AlertTriangle, X} from 'lucide-react';
import React, {useState} from 'react';
import {useChatInput} from './ChatInputContext';

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
 * - Consistent with design system styling
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
      className="bg-warning/10 border border-warning/30 text-primary text-sm px-4 py-3 rounded-lg flex items-center gap-3 mb-2"
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning"/>
      <span className="truncate flex-1" title={errorMessage}>
        {errorMessage}
      </span>
      <button
        onClick={handleClose}
        onKeyDown={handleKeyDown}
        aria-label="Dismiss warning"
        className="flex-shrink-0 p-1.5 rounded-md hover:bg-warning/20 transition-colors focus-ring"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};


