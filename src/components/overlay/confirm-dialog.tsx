import { X } from 'lucide-react';
import { FocusTrap } from 'focus-trap-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-500',
    warning: 'bg-amber-600 hover:bg-amber-500',
    info: 'bg-indigo-600 hover:bg-indigo-500'
  };

  return (
    <FocusTrap>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-secondary border border-primary rounded-card shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b border-primary">
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            <button
              onClick={onCancel}
              className="text-muted hover:text-primary transition-colors"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-secondary">{message}</p>
          </div>
          <div className="flex gap-3 p-4 border-t border-primary">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-tertiary hover:bg-hover text-secondary rounded-button transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-button transition-colors ${variantStyles[variant]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
