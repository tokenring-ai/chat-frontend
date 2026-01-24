import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils.ts';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyles = {
  success: 'border-emerald-500/30 bg-emerald-900/20 text-emerald-400',
  error: 'border-red-500/30 bg-red-900/20 text-red-400',
  info: 'border-blue-500/30 bg-blue-900/20 text-blue-400',
  warning: 'border-amber-500/30 bg-amber-900/20 text-amber-400',
};

export default function Toast({ type = 'info', title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  useEffect(() => {
    if (!isVisible && onClose) {
      const timer = setTimeout(onClose, 300); // Wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const Icon = toastIcons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-md',
            toastStyles[type]
          )}
          role="alert"
          aria-live={type === 'error' ? 'assertive' : 'polite'}
        >
          <Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {title && <h4 className="font-medium text-sm mb-1">{title}</h4>}
            <p className="text-sm leading-relaxed break-words">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={() => setIsVisible(false)}
              className="shrink-0 p-0.5 rounded hover:bg-black/20 transition-colors"
              aria-label="Close toast"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast Container for managing multiple toasts
interface ToastContainerProps {
  toasts: ToastProps[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={() => toast.id && onRemove(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Simple toast context and hook for easy usage
interface ToastItem extends ToastProps {
  id: string;
}

class ToastManager {
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set();
  private toasts: ToastItem[] = [];

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  add(toast: Omit<ToastItem, 'id'>): string {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = { ...toast, id };
    this.toasts.push(newToast);
    this.notify();
    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  success(message: string, options?: Partial<ToastProps>) {
    return this.add({ type: 'success', message, ...options });
  }

  error(message: string, options?: Partial<ToastProps>) {
    return this.add({ type: 'error', message, ...options });
  }

  info(message: string, options?: Partial<ToastProps>) {
    return this.add({ type: 'info', message, ...options });
  }

  warning(message: string, options?: Partial<ToastProps>) {
    return this.add({ type: 'warning', message, ...options });
  }
}

export const toastManager = new ToastManager();
