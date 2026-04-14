export interface NotificationOptions {
  id?: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

class NotificationService {
  private notifications: NotificationOptions[] = [];
  private listeners: ((notifications: NotificationOptions[]) => void)[] = [];

  subscribe(listener: (notifications: NotificationOptions[]) => void) {
    this.listeners.push(listener);
    listener(this.notifications);
  }

  unsubscribe(listener: (notifications: NotificationOptions[]) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  show(options: NotificationOptions) {
    const notification = {
      ...options,
      id: Date.now() + Math.random(),
      duration: options.duration || 5000
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto remove after duration
    setTimeout(() => {
      this.remove(notification.id);
    }, notification.duration);
  }

  remove(id: number) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  success(title: string, message?: string) {
    this.show({ type: 'success', title, message });
  }

  error(title: string, message?: string) {
    this.show({ type: 'error', title, message, duration: 7000 });
  }

  warning(title: string, message?: string) {
    this.show({ type: 'warning', title, message });
  }

  info(title: string, message?: string) {
    this.show({ type: 'info', title, message });
  }

  clear() {
    this.notifications = [];
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
