import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
 * - Consistent with design system styling
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
      className="bg-amber-50 dark:bg-amber-900/90 text-primary px-4 py-3 rounded-lg border border-amber-500/30 dark:border-amber-500/50 flex justify-between items-start gap-3 shadow-md"
    >
      <div className="flex items-start gap-3 flex-1">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <strong className="block mb-1 text-sm font-semibold text-primary">
            Chat Input History Disabled
          </strong>
          <div className="text-sm text-primary">{errorMessage}</div>
          <div className="mt-1 text-2xs text-primary/70">
            Your typed messages won't be saved between sessions until storage is available.
          </div>
        </div>
      </div>
      
      <button
        onClick={dismissStorageError}
        className="shrink-0 p-1.5 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors focus-ring"
        aria-label="Dismiss warning"
        title="Dismiss this warning"
      >
        <X className="w-4 h-4 text-primary" />
      </button>
    </div>
  );
};
