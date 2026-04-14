import { notificationService } from './notifications';

// Replace all alert() calls with these functions
export const showAlert = {
  success: (message: string) => {
    notificationService.success('Success', message);
  },
  error: (message: string) => {
    notificationService.error('Error', message);
  },
  warning: (message: string) => {
    notificationService.warning('Warning', message);
  },
  info: (message: string) => {
    notificationService.info('Info', message);
  }
};

// For backward compatibility, you can still use alert() style
export const alert = {
  success: showAlert.success,
  error: showAlert.error,
  warning: showAlert.warning,
  info: showAlert.info
};

// Direct replacement for alert() calls
export const replaceAlert = (message: string) => {
  showAlert.info(message);
};

// Export alert as a function for direct use
export const alertFunction = (message: string) => {
  showAlert.info(message);
};

// Direct replacement for alert() calls - this can be imported as 'alert'
export const directAlert = (message: string) => {
  showAlert.info(message);
};
