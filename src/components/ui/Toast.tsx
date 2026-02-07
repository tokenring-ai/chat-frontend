import {AnimatePresence, motion} from 'framer-motion';
import {AlertCircle, AlertTriangle, CheckCircle, Info, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import {cn} from '../../lib/utils.ts';

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
  success: 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/90 text-emerald-900 dark:text-emerald-100',
  error: 'border-red-500/50 bg-red-50 dark:bg-red-900/90 text-red-900 dark:text-red-100',
  info: 'border-blue-500/50 bg-blue-50 dark:bg-blue-900/90 text-blue-900 dark:text-blue-100',
  warning: 'border-amber-500/50 bg-amber-50 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100',
};

export default function Toast({id, type = 'info', title, message, duration = 5000, onClose}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, [id, message]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, message]);

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

interface NotificationItem extends ToastItem {
  timestamp: number;
  read: boolean;
}

class NotificationManager {
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set();
  private toastListeners: Set<(toasts: ToastItem[]) => void> = new Set();
  private notifications: NotificationItem[] = [];
  private activeToasts: ToastItem[] = [];

  subscribeNotifications(listener: (notifications: NotificationItem[]) => void) {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  subscribeToasts(listener: (toasts: ToastItem[]) => void) {
    this.toastListeners.add(listener);
    listener([...this.activeToasts]);
    return () => this.toastListeners.delete(listener);
  }

  add(toast: Omit<ToastItem, 'id'>): string {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: NotificationItem = {...toast, id, timestamp: Date.now(), read: false};

    this.notifications.unshift(notification);
    if (this.notifications.length > 50) this.notifications.pop();
    this.notifyNotifications();

    this.activeToasts.push({...toast, id});
    this.notifyToasts();

    return id;
  }

  removeToast(id: string) {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
    this.notifyToasts();
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyNotifications();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyNotifications();
  }

  clearNotifications() {
    this.notifications = [];
    this.notifyNotifications();
  }

  private notifyNotifications() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private notifyToasts() {
    this.toastListeners.forEach(listener => listener([...this.activeToasts]));
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

export const notificationManager = new NotificationManager();
export const toastManager = {
  success: (msg: string, opts?: Partial<ToastProps>) => notificationManager.success(msg, opts),
  error: (msg: string, opts?: Partial<ToastProps>) => notificationManager.error(msg, opts),
  info: (msg: string, opts?: Partial<ToastProps>) => notificationManager.info(msg, opts),
  warning: (msg: string, opts?: Partial<ToastProps>) => notificationManager.warning(msg, opts),
  remove: (id: string) => notificationManager.removeToast(id),
};

export type {NotificationItem};
